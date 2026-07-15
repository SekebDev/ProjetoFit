import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

const PASSWORD = "senha-de-teste-123";

/** Ordem importa por causa das FKs. */
async function limpaTudo(prisma: PrismaService): Promise<void> {
  await prisma.setLog.deleteMany();
  await prisma.workoutSession.deleteMany();
  await prisma.planExercise.deleteMany();
  await prisma.planDay.deleteMany();
  await prisma.workoutPlan.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.exercise.deleteMany();
}

describe("Sessions (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenA = "";
  let tokenB = "";
  /** Exercicio prescrito no dia de A. */
  let exerciseId = "";
  /** Exercicio que existe, mas NAO esta no dia de A. */
  let outroExerciseId = "";
  let planDayA = "";
  let planDayB = "";

  async function register(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email, password: PASSWORD, name: null })
      .expect(201);
    return res.body.token as string;
  }

  /** Cria um plano de um dia so, com o exercicio prescrito, e devolve o dia. */
  async function criaPlano(token: string, nome: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/api/plans")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: nome,
        notes: null,
        days: [
          {
            name: "Push",
            focus: null,
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
        ],
      })
      .expect(201);
    return res.body.days[0].id as string;
  }

  function iniciaSessao(token: string, planDayId: string) {
    return request(app.getHttpServer())
      .post("/api/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ planDayId });
  }

  function serie(over: Record<string, unknown> = {}) {
    return {
      exerciseId,
      setNumber: 1,
      weightKg: 60,
      reps: 10,
      rpe: 8,
      completed: true,
      ...over,
    };
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

    const ex = await prisma.exercise.create({
      data: {
        slug: "e2e-sessao-supino",
        name: "Supino reto",
        muscleGroup: "CHEST",
        category: "COMPOUND",
        equipment: "BARBELL",
        defaultRestSec: 120,
      },
    });
    exerciseId = ex.id;

    const outro = await prisma.exercise.create({
      data: {
        slug: "e2e-sessao-agacho",
        name: "Agachamento",
        muscleGroup: "LEGS",
        category: "COMPOUND",
        equipment: "BARBELL",
        defaultRestSec: 180,
      },
    });
    outroExerciseId = outro.id;

    tokenA = await register("sessao-a@teste.com");
    tokenB = await register("sessao-b@teste.com");
    planDayA = await criaPlano(tokenA, "Plano do A");
    planDayB = await criaPlano(tokenB, "Plano do B");
  });

  afterAll(async () => {
    await limpaTudo(prisma);
    await app.close();
  });

  /** Cada teste comeca sem sessao, senao o start idempotente reusa a anterior. */
  beforeEach(async () => {
    await prisma.setLog.deleteMany();
    await prisma.workoutSession.deleteMany();
  });

  describe("POST /sessions", () => {
    it("abre uma sessao com finishedAt null", async () => {
      const res = await iniciaSessao(tokenA, planDayA).expect(200);

      expect(res.body.finishedAt).toBeNull();
      expect(res.body.planDay.name).toBe("Push");
      expect(res.body.setLogs).toEqual([]);
    });

    it("devolve a prescricao do dia pra tela de treino renderizar", async () => {
      const res = await iniciaSessao(tokenA, planDayA).expect(200);

      expect(res.body.planDay.exercises).toHaveLength(1);
      expect(res.body.planDay.exercises[0]).toMatchObject({
        sets: 3,
        repScheme: "8-12",
        restSec: 120,
      });
      expect(res.body.planDay.exercises[0].exercise.name).toBe("Supino reto");
    });

    it("devolve a mesma sessao em vez de abrir outra", async () => {
      const primeira = await iniciaSessao(tokenA, planDayA).expect(200);
      const segunda = await iniciaSessao(tokenA, planDayA).expect(200);

      expect(segunda.body.id).toBe(primeira.body.id);
      expect(await prisma.workoutSession.count()).toBe(1);
    });

    it("abre uma nova sessao depois que a anterior foi encerrada", async () => {
      const primeira = await iniciaSessao(tokenA, planDayA).expect(200);
      await request(app.getHttpServer())
        .patch(`/api/sessions/${primeira.body.id}/finish`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ notes: null })
        .expect(200);

      const segunda = await iniciaSessao(tokenA, planDayA).expect(200);

      expect(segunda.body.id).not.toBe(primeira.body.id);
    });

    it("rejeita planDay inexistente com 404", async () => {
      await iniciaSessao(tokenA, "nao-existe").expect(404);
    });

    it("rejeita planDayId vazio com 400", async () => {
      await iniciaSessao(tokenA, "").expect(400);
    });

    it("exige autenticacao", async () => {
      await request(app.getHttpServer())
        .post("/api/sessions")
        .send({ planDayId: planDayA })
        .expect(401);
    });
  });

  describe("POST /sessions/:id/logs", () => {
    let sessionId = "";

    beforeEach(async () => {
      const res = await iniciaSessao(tokenA, planDayA).expect(200);
      sessionId = res.body.id;
    });

    function registra(token: string, id: string, body: object) {
      return request(app.getHttpServer())
        .post(`/api/sessions/${id}/logs`)
        .set("Authorization", `Bearer ${token}`)
        .send(body);
    }

    it("registra uma serie", async () => {
      const res = await registra(tokenA, sessionId, serie()).expect(200);

      expect(res.body).toMatchObject({
        exerciseId,
        setNumber: 1,
        weightKg: 60,
        reps: 10,
        rpe: 8,
        completed: true,
      });
    });

    it("reenviar a mesma serie corrige a carga, sem duplicar", async () => {
      await registra(tokenA, sessionId, serie()).expect(200);
      await registra(tokenA, sessionId, serie({ weightKg: 65 })).expect(200);

      const logs = await prisma.setLog.findMany({ where: { sessionId } });
      expect(logs).toHaveLength(1);
      expect(logs[0].weightKg).toBe(65);
    });

    it("aceita serie sem carga e sem rpe (peso corporal)", async () => {
      await registra(
        tokenA,
        sessionId,
        serie({ weightKg: null, rpe: null }),
      ).expect(200);
    });

    it("rejeita exercicio fora do treino com 400, e nao com 500", async () => {
      const res = await registra(
        tokenA,
        sessionId,
        serie({ exerciseId: outroExerciseId }),
      ).expect(400);

      expect(res.body.message).toMatch(/não faz parte/i);
    });

    it("rejeita rpe fora da escala com 400", async () => {
      await registra(tokenA, sessionId, serie({ rpe: 11 })).expect(400);
    });

    it("rejeita rpe quebrado (7.3) com 400", async () => {
      await registra(tokenA, sessionId, serie({ rpe: 7.3 })).expect(400);
    });

    it("rejeita registrar serie em sessao ja encerrada com 400", async () => {
      await request(app.getHttpServer())
        .patch(`/api/sessions/${sessionId}/finish`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ notes: null })
        .expect(200);

      const res = await registra(tokenA, sessionId, serie()).expect(400);
      expect(res.body.message).toMatch(/encerrada/i);
    });
  });

  describe("PATCH /sessions/:id/finish", () => {
    let sessionId = "";

    beforeEach(async () => {
      const res = await iniciaSessao(tokenA, planDayA).expect(200);
      sessionId = res.body.id;
    });

    function finaliza(token: string, id: string, notes: string | null = null) {
      return request(app.getHttpServer())
        .patch(`/api/sessions/${id}/finish`)
        .set("Authorization", `Bearer ${token}`)
        .send({ notes });
    }

    it("encerra a sessao e calcula a duracao", async () => {
      const res = await finaliza(tokenA, sessionId, "treino bom").expect(200);

      expect(res.body.finishedAt).not.toBeNull();
      expect(res.body.durationSec).toBeGreaterThanOrEqual(0);
      expect(res.body.notes).toBe("treino bom");
    });

    it("repetir o finish nao estica a duracao do treino", async () => {
      const primeira = await finaliza(tokenA, sessionId).expect(200);
      const segunda = await finaliza(tokenA, sessionId, "esqueci a nota").expect(
        200,
      );

      expect(segunda.body.finishedAt).toBe(primeira.body.finishedAt);
      expect(segunda.body.durationSec).toBe(primeira.body.durationSec);
      // ...mas a nota do retry entra.
      expect(segunda.body.notes).toBe("esqueci a nota");
    });

    it("rejeita sessao inexistente com 404", async () => {
      await finaliza(tokenA, "nao-existe").expect(404);
    });
  });

  describe("GET /sessions", () => {
    it("lista as sessoes com a contagem de series", async () => {
      const res = await iniciaSessao(tokenA, planDayA).expect(200);
      await request(app.getHttpServer())
        .post(`/api/sessions/${res.body.id}/logs`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send(serie())
        .expect(200);

      const lista = await request(app.getHttpServer())
        .get("/api/sessions")
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);

      expect(lista.body).toHaveLength(1);
      expect(lista.body[0]).toMatchObject({ planDayName: "Push", setCount: 1 });
    });

    it("nao mostra as sessoes de outro usuario", async () => {
      await iniciaSessao(tokenA, planDayA).expect(200);

      const lista = await request(app.getHttpServer())
        .get("/api/sessions")
        .set("Authorization", `Bearer ${tokenB}`)
        .expect(200);

      expect(lista.body).toEqual([]);
    });
  });

  describe("GET /sessions/last-loads", () => {
    function ultimas(token: string, planDayId: string) {
      return request(app.getHttpServer())
        .get("/api/sessions/last-loads")
        .query({ planDayId })
        .set("Authorization", `Bearer ${token}`);
    }

    /** Treina, registra a carga e encerra — vira historico. */
    async function treinoEncerrado(weightKg: number): Promise<void> {
      const res = await iniciaSessao(tokenA, planDayA).expect(200);
      await request(app.getHttpServer())
        .post(`/api/sessions/${res.body.id}/logs`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send(serie({ weightKg }))
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/sessions/${res.body.id}/finish`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ notes: null })
        .expect(200);
    }

    it("devolve a carga do treino anterior", async () => {
      await treinoEncerrado(60);

      const res = await ultimas(tokenA, planDayA).expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        exercise: { id: exerciseId, name: "Supino reto" },
        weightKg: 60,
        reps: 10,
      });
    });

    it("devolve a mais recente quando ha varios treinos", async () => {
      await treinoEncerrado(60);
      await treinoEncerrado(65);

      const res = await ultimas(tokenA, planDayA).expect(200);

      expect(res.body[0].weightKg).toBe(65);
    });

    it("ignora as series da sessao ainda aberta", async () => {
      await treinoEncerrado(60);
      // Treino de hoje, em andamento, com carga maior: nao pode virar a
      // "ultima carga" e mudar o campo embaixo do usuario no meio do treino.
      const hoje = await iniciaSessao(tokenA, planDayA).expect(200);
      await request(app.getHttpServer())
        .post(`/api/sessions/${hoje.body.id}/logs`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send(serie({ weightKg: 100 }))
        .expect(200);

      const res = await ultimas(tokenA, planDayA).expect(200);

      expect(res.body[0].weightKg).toBe(60);
    });

    it("devolve vazio quando nunca treinou", async () => {
      const res = await ultimas(tokenA, planDayA).expect(200);

      expect(res.body).toEqual([]);
    });

    it("exige o planDayId", async () => {
      await request(app.getHttpServer())
        .get("/api/sessions/last-loads")
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(400);
    });
  });

  // O ataque aqui e trivial: trocar o id na URL pelo de outro usuario. Todas as
  // respostas sao 404, nunca 403 — um 403 confirmaria que o recurso existe.
  describe("IDOR: os ids de outro usuario", () => {
    it("nao deixa abrir sessao no dia de treino alheio", async () => {
      await iniciaSessao(tokenA, planDayB).expect(404);
    });

    it("nao deixa registrar serie na sessao alheia", async () => {
      const alheia = await iniciaSessao(tokenB, planDayB).expect(200);

      await request(app.getHttpServer())
        .post(`/api/sessions/${alheia.body.id}/logs`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send(serie())
        .expect(404);
    });

    it("nao deixa encerrar a sessao alheia", async () => {
      const alheia = await iniciaSessao(tokenB, planDayB).expect(200);

      await request(app.getHttpServer())
        .patch(`/api/sessions/${alheia.body.id}/finish`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ notes: null })
        .expect(404);
    });

    it("nao deixa ler as cargas do dia alheio", async () => {
      await request(app.getHttpServer())
        .get("/api/sessions/last-loads")
        .query({ planDayId: planDayB })
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(404);
    });

    it("nao vaza a sessao alheia no historico", async () => {
      const alheia = await iniciaSessao(tokenB, planDayB).expect(200);

      const lista = await request(app.getHttpServer())
        .get("/api/sessions")
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);

      expect(lista.body.map((s: { id: string }) => s.id)).not.toContain(
        alheia.body.id,
      );
    });
  });
});
