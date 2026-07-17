import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { CreatePlanInput } from "@workout/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

const PASSWORD = "senha-de-teste-123";

/** Ordem importa por causa das FKs. */
async function limpaTudo(prisma: PrismaService): Promise<void> {
  await prisma.planExercise.deleteMany();
  await prisma.planDay.deleteMany();
  await prisma.workoutPlan.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.exercise.deleteMany();
}

describe("Plans (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenA = "";
  let tokenB = "";
  let exerciseId = "";
  let planInput: CreatePlanInput;

  async function register(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email, password: PASSWORD, name: null })
      .expect(201);
    return res.body.token as string;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    // Espelha o bootstrap real (src/main.ts:11), senao as rotas nao batem.
    app.setGlobalPrefix("api");
    await app.init();
    prisma = app.get(PrismaService);

    await limpaTudo(prisma);

    const exercise = await prisma.exercise.create({
      data: {
        slug: "e2e-supino",
        name: "Supino reto",
        muscleGroup: "CHEST",
        category: "COMPOUND",
        equipment: "BARBELL",
        defaultRestSec: 120,
      },
    });
    exerciseId = exercise.id;

    planInput = {
      name: "Push/Pull",
      notes: null,
      days: [
        {
          name: "Push",
          focus: "Peito e ombro",
          weekday: 1,
          exercises: [
            {
              exerciseId,
              sets: 3,
              repScheme: "8-12",
              restSec: 120,
              notes: null,
            },
          ],
        },
        {
          name: "Pull",
          focus: null,
          weekday: 3,
          exercises: [
            { exerciseId, sets: 4, repScheme: "10", restSec: 90, notes: null },
          ],
        },
      ],
    };

    const stamp = Date.now();
    tokenA = await register(`a-${stamp}@teste.local`);
    tokenB = await register(`b-${stamp}@teste.local`);
  });

  afterAll(async () => {
    await limpaTudo(prisma);
    await app.close();
  });

  describe("autenticacao", () => {
    it("recusa a listagem sem token", async () => {
      await request(app.getHttpServer()).get("/api/plans").expect(401);
    });
  });

  describe("criacao", () => {
    it("cria o plano com dias e exercicios aninhados na ordem enviada", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/plans")
        .set("Authorization", `Bearer ${tokenA}`)
        .send(planInput)
        .expect(201);

      expect(res.body.name).toBe("Push/Pull");
      expect(res.body.source).toBe("MANUAL");
      expect(res.body.isActive).toBe(false);
      expect(res.body.days).toHaveLength(2);
      expect(res.body.days.map((d: { order: number }) => d.order)).toEqual([
        0, 1,
      ]);
      expect(res.body.days[0].name).toBe("Push");
      expect(res.body.days[0].exercises[0].exercise.name).toBe("Supino reto");
      // O dia da semana agendado sobrevive a ida e volta ao Postgres.
      expect(res.body.days.map((d: { weekday: number | null }) => d.weekday)).toEqual(
        [1, 3],
      );
    });

    it("rejeita corpo invalido com 400", async () => {
      await request(app.getHttpServer())
        .post("/api/plans")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "", notes: null, days: [] })
        .expect(400);
    });

    it("rejeita exercicio inexistente com 400, e nao com 500", async () => {
      // Antes da checagem explicita isto virava P2003 do Prisma -> 500.
      await request(app.getHttpServer())
        .post("/api/plans")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          name: "Fantasma",
          notes: null,
          days: [
            {
              name: "D",
              focus: null,
              weekday: null,
              exercises: [
                {
                  exerciseId: "nao-existe-123",
                  sets: 3,
                  repScheme: "8-12",
                  restSec: 60,
                  notes: null,
                },
              ],
            },
          ],
        })
        .expect(400);
    });

    it("rejeita repScheme fora do formato", async () => {
      await request(app.getHttpServer())
        .post("/api/plans")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          ...planInput,
          days: [
            {
              name: "Push",
              focus: null,
              weekday: null,
              exercises: [
                {
                  exerciseId,
                  sets: 3,
                  repScheme: "muitas",
                  restSec: 60,
                  notes: null,
                },
              ],
            },
          ],
        })
        .expect(400);
    });
  });

  describe("isolamento entre usuarios (IDOR)", () => {
    let planIdDoA = "";

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/plans")
        .set("Authorization", `Bearer ${tokenA}`)
        .send(planInput);
      planIdDoA = res.body.id;
    });

    it("B nao ve o plano de A na listagem", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/plans")
        .set("Authorization", `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body.every((p: { id: string }) => p.id !== planIdDoA)).toBe(
        true,
      );
    });

    it("B recebe 404 ao ler o plano de A pelo id", async () => {
      await request(app.getHttpServer())
        .get(`/api/plans/${planIdDoA}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .expect(404);
    });

    it("B recebe 404 ao tentar editar o plano de A", async () => {
      await request(app.getHttpServer())
        .put(`/api/plans/${planIdDoA}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ ...planInput, name: "Invadido" })
        .expect(404);
    });

    it("B recebe 404 ao tentar ativar o plano de A", async () => {
      await request(app.getHttpServer())
        .put(`/api/plans/${planIdDoA}/activate`)
        .set("Authorization", `Bearer ${tokenB}`)
        .expect(404);
    });

    it("B recebe 404 ao tentar apagar o plano de A, e o plano sobrevive", async () => {
      await request(app.getHttpServer())
        .delete(`/api/plans/${planIdDoA}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .expect(404);

      await request(app.getHttpServer())
        .get(`/api/plans/${planIdDoA}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);
    });
  });

  describe("plano ativo", () => {
    it("mantem exatamente um plano ativo por usuario", async () => {
      const first = await request(app.getHttpServer())
        .post("/api/plans")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ ...planInput, name: "Primeiro" });
      const second = await request(app.getHttpServer())
        .post("/api/plans")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ ...planInput, name: "Segundo" });

      await request(app.getHttpServer())
        .put(`/api/plans/${first.body.id}/activate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);
      await request(app.getHttpServer())
        .put(`/api/plans/${second.body.id}/activate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);

      const list = await request(app.getHttpServer())
        .get("/api/plans")
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);

      const ativos = list.body.filter((p: { isActive: boolean }) => p.isActive);
      expect(ativos).toHaveLength(1);
      expect(ativos[0].id).toBe(second.body.id);
    });
  });

  describe("edicao", () => {
    it("substitui os dias do plano inteiro", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/plans")
        .set("Authorization", `Bearer ${tokenA}`)
        .send(planInput);

      const res = await request(app.getHttpServer())
        .put(`/api/plans/${created.body.id}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          name: "Full Body",
          notes: "3x por semana",
          days: [
            {
              name: "Dia unico",
              focus: null,
              weekday: null,
              exercises: [
                {
                  exerciseId,
                  sets: 5,
                  repScheme: "5",
                  restSec: 180,
                  notes: null,
                },
              ],
            },
          ],
        })
        .expect(200);

      expect(res.body.name).toBe("Full Body");
      expect(res.body.days).toHaveLength(1);
      expect(res.body.days[0].name).toBe("Dia unico");
      expect(res.body.days[0].exercises[0].sets).toBe(5);
    });
  });

  describe("remocao", () => {
    it("apaga o plano do proprio dono e devolve 404 depois", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/plans")
        .set("Authorization", `Bearer ${tokenA}`)
        .send(planInput);

      await request(app.getHttpServer())
        .delete(`/api/plans/${created.body.id}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/plans/${created.body.id}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(404);
    });
  });
});
