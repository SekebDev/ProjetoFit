import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AiPlan } from "@workout/shared";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OPENAI } from "../src/ai/openai.provider";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

const PASSWORD = "senha-de-teste-123";

async function limpaTudo(prisma: PrismaService): Promise<void> {
  await prisma.setLog.deleteMany();
  await prisma.workoutSession.deleteMany();
  await prisma.planExercise.deleteMany();
  await prisma.planDay.deleteMany();
  await prisma.workoutPlan.deleteMany();
  await prisma.bodyMetric.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.exercise.deleteMany();
}

/**
 * A OpenAI e sempre dublada, inclusive aqui.
 *
 * Nao existe versao deste teste que chame a API de verdade: custaria dinheiro a
 * cada rodada, o resultado nao seria deterministico e o CI nao tem chave. O que
 * o e2e prova e o caminho completo — rota, guardas, persistencia — com a
 * fronteira da OpenAI substituida.
 */
const SLUG = "e2e-ai-supino";

function planoDaIA(slug: string): AiPlan {
  return {
    name: "Plano Gerado",
    summary: "Hipertrofia em 1 dia.",
    days: [
      {
        name: "Push",
        focus: "Peito",
        weekday: 1,
        exercises: [
          { slug, sets: 3, repScheme: "8-12", restSec: 120, notes: null },
        ],
      },
    ],
  };
}

describe("AI (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token = "";
  const parse = vi.fn();

  /** Monta o app com o cliente da OpenAI substituido (ou ausente). */
  async function sobeApp(openai: unknown): Promise<void> {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OPENAI)
      .useValue(openai)
      .compile();

    app = moduleRef.createNestApplication();
    // Espelha o bootstrap real (src/main.ts:11), senao as rotas nao batem.
    app.setGlobalPrefix("api");
    await app.init();
    prisma = app.get(PrismaService);
  }

  async function preparaUsuario(): Promise<void> {
    await limpaTudo(prisma);

    await prisma.exercise.create({
      data: {
        slug: SLUG,
        name: "Supino reto",
        muscleGroup: "CHEST",
        category: "COMPOUND",
        equipment: "BARBELL",
        defaultRestSec: 120,
      },
    });

    const reg = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email: "ai-a@teste.com", password: PASSWORD, name: null })
      .expect(201);
    token = reg.body.token;

    await request(app.getHttpServer())
      .put("/api/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        birthYear: 1995,
        heightCm: 178,
        weightKg: 82,
        goal: "HYPERTROPHY",
        experience: "INTERMEDIATE",
        daysPerWeek: 3,
        sessionMin: 60,
        focusAreas: ["CHEST"],
        equipment: ["BARBELL"],
        injuries: null,
      })
      .expect(200);
  }

  function gera(body: object = { notes: null }) {
    return request(app.getHttpServer())
      .post("/api/ai/plans/generate")
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  afterEach(async () => {
    await limpaTudo(prisma);
    await app.close();
    parse.mockReset();
  });

  describe("com a IA configurada", () => {
    beforeEach(async () => {
      await sobeApp({ responses: { parse } });
      await preparaUsuario();
    });

    it("gera o plano e persiste com source AI", async () => {
      parse.mockResolvedValueOnce({ output_parsed: planoDaIA(SLUG) });

      const res = await gera().expect(201);

      expect(res.body).toMatchObject({ name: "Plano Gerado", source: "AI" });
      expect(res.body.days[0].exercises[0].exercise.name).toBe("Supino reto");

      // Foi mesmo pro banco, e nao so pra resposta.
      const salvo = await prisma.workoutPlan.findFirst();
      expect(salvo).toMatchObject({ name: "Plano Gerado", source: "AI" });
    });

    it("o plano gerado aparece na listagem junto com os manuais", async () => {
      parse.mockResolvedValueOnce({ output_parsed: planoDaIA(SLUG) });
      await gera().expect(201);

      const lista = await request(app.getHttpServer())
        .get("/api/plans")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(lista.body).toHaveLength(1);
      expect(lista.body[0]).toMatchObject({ source: "AI", dayCount: 1 });
    });

    it("id inventado dispara retry e a segunda resposta e salva", async () => {
      parse
        .mockResolvedValueOnce({ output_parsed: planoDaIA("id-que-nao-existe") })
        .mockResolvedValueOnce({ output_parsed: planoDaIA(SLUG) });

      await gera().expect(201);

      expect(parse).toHaveBeenCalledTimes(2);
    });

    it("id inventado nas duas tentativas vira 502 e nao salva nada", async () => {
      parse.mockResolvedValue({ output_parsed: planoDaIA("id-que-nao-existe") });

      await gera().expect(502);

      expect(await prisma.workoutPlan.count()).toBe(0);
    });

    it("exige perfil preenchido", async () => {
      await prisma.profile.deleteMany();

      await gera().expect(404);
    });

    it("rejeita notes gigante com 400", async () => {
      await gera({ notes: "x".repeat(501) }).expect(400);
    });

    it("exige autenticacao", async () => {
      await request(app.getHttpServer())
        .post("/api/ai/plans/generate")
        .send({ notes: null })
        .expect(401);
    });

    // O endpoint que custa dinheiro e o unico com teto.
    it("corta na sexta geracao da hora", async () => {
      parse.mockResolvedValue({ output_parsed: planoDaIA(SLUG) });

      for (let i = 0; i < 5; i++) {
        await gera().expect(201);
      }

      await gera().expect(429);
    });

    // Regressao: o throttler padrao conta por IP, e no teste (e atras de um
    // proxy em producao) todos saem do mesmo IP. Sem o UserThrottlerGuard, o
    // usuario B herdaria o limite estourado por A.
    it("o limite e por usuario, nao por IP compartilhado", async () => {
      parse.mockResolvedValue({ output_parsed: planoDaIA(SLUG) });

      // A esgota a cota.
      for (let i = 0; i < 5; i++) {
        await gera().expect(201);
      }
      await gera().expect(429);

      // B, do mesmo IP, comeca zerado.
      const regB = await request(app.getHttpServer())
        .post("/api/auth/register")
        .send({ email: "ai-b@teste.com", password: PASSWORD, name: null })
        .expect(201);
      await request(app.getHttpServer())
        .put("/api/profile")
        .set("Authorization", `Bearer ${regB.body.token}`)
        .send({
          birthYear: 1990,
          heightCm: 170,
          weightKg: 70,
          goal: "STRENGTH",
          experience: "BEGINNER",
          daysPerWeek: 3,
          sessionMin: 60,
          focusAreas: ["CHEST"],
          equipment: ["BARBELL"],
          injuries: null,
        })
        .expect(200);

      await request(app.getHttpServer())
        .post("/api/ai/plans/generate")
        .set("Authorization", `Bearer ${regB.body.token}`)
        .send({ notes: null })
        .expect(201);
    });
  });

  describe("sem a chave configurada", () => {
    beforeEach(async () => {
      // `null` e o que o openAiProvider devolve sem OPENAI_API_KEY — o estado
      // real de quem so quer usar plano manual, e o do CI.
      await sobeApp(null);
      await preparaUsuario();
    });

    it("o app sobe e o resto da API funciona normalmente", async () => {
      await request(app.getHttpServer())
        .get("/api/plans")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    });

    it("a geracao devolve 503 explicando, e nao 500", async () => {
      const res = await gera().expect(503);

      expect(res.body.message).toMatch(/não está configurada/i);
    });
  });
});
