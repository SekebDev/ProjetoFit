import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

const PASSWORD = "senha-de-teste-123";
const SP = "America/Sao_Paulo";

/** Ordem importa por causa das FKs. */
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

describe("Progress (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenA = "";
  let tokenB = "";
  let supinoId = "";
  let barraId = "";
  let planDayA = "";
  let planDayB = "";

  async function register(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email, password: PASSWORD, name: null })
      .expect(201);
    return res.body.token as string;
  }

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
            weekday: null,
            exercises: [
              {
                exerciseId: supinoId,
                sets: 3,
                repScheme: "8-12",
                restSec: 120,
                notes: null,
              },
              {
                exerciseId: barraId,
                sets: 3,
                repScheme: "8-12",
                restSec: 90,
                notes: null,
              },
            ],
          },
        ],
      })
      .expect(201);
    return res.body.days[0].id as string;
  }

  interface SerieInput {
    exerciseId: string;
    setNumber: number;
    weightKg: number | null;
    reps: number | null;
  }

  /**
   * Um treino completo e encerrado. O `date` fixa o instante da sessao — e o
   * que permite testar o fatiamento por semana sem esperar o calendario.
   */
  async function treino(
    token: string,
    planDayId: string,
    series: SerieInput[],
    date?: Date,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/api/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ planDayId })
      .expect(200);
    const sessionId = res.body.id as string;

    for (const s of series) {
      await request(app.getHttpServer())
        .post(`/api/sessions/${sessionId}/logs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ ...s, rpe: null, completed: true })
        .expect(200);
    }

    await request(app.getHttpServer())
      .patch(`/api/sessions/${sessionId}/finish`)
      .set("Authorization", `Bearer ${token}`)
      .send({ notes: null, tz: "America/Sao_Paulo" })
      .expect(200);

    if (date) {
      await prisma.workoutSession.update({
        where: { id: sessionId },
        data: { date },
      });
    }
    return sessionId;
  }

  function abreSessao(token: string, planDayId: string) {
    return request(app.getHttpServer())
      .post("/api/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ planDayId });
  }

  function registraSerie(token: string, sessionId: string, s: SerieInput) {
    return request(app.getHttpServer())
      .post(`/api/sessions/${sessionId}/logs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...s, rpe: null, completed: true });
  }

  function summary(token: string, tz: string = SP) {
    return request(app.getHttpServer())
      .get("/api/progress/summary")
      .query({ tz })
      .set("Authorization", `Bearer ${token}`);
  }

  function porExercicio(token: string, id: string) {
    return request(app.getHttpServer())
      .get(`/api/progress/exercise/${id}`)
      .set("Authorization", `Bearer ${token}`);
  }

  function prDoSupino(body: { records: { exercise: { id: string } }[] }) {
    return body.records.find((r) => r.exercise.id === supinoId);
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

    const supino = await prisma.exercise.create({
      data: {
        slug: "e2e-prog-supino",
        name: "Supino reto",
        muscleGroup: "CHEST",
        category: "COMPOUND",
        equipment: "BARBELL",
        defaultRestSec: 120,
      },
    });
    supinoId = supino.id;

    // Peso corporal: existe pra provar que exercicio sem carga nao vira PR nem
    // volume — e o caso que um COALESCE distraido transformaria em 0.
    const barra = await prisma.exercise.create({
      data: {
        slug: "e2e-prog-barra",
        name: "Barra fixa",
        muscleGroup: "BACK",
        category: "COMPOUND",
        equipment: "BODYWEIGHT",
        defaultRestSec: 90,
      },
    });
    barraId = barra.id;

    tokenA = await register("progresso-a@teste.com");
    tokenB = await register("progresso-b@teste.com");
    planDayA = await criaPlano(tokenA, "Plano do A");
    planDayB = await criaPlano(tokenB, "Plano do B");
  });

  afterAll(async () => {
    await limpaTudo(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await prisma.setLog.deleteMany();
    await prisma.workoutSession.deleteMany();
    await prisma.bodyMetric.deleteMany();
  });

  describe("GET /progress/exercise/:id", () => {
    it("uma sessao encerrada vira um ponto, com carga maxima e volume", async () => {
      await treino(tokenA, planDayA, [
        { exerciseId: supinoId, setNumber: 1, weightKg: 60, reps: 10 },
        { exerciseId: supinoId, setNumber: 2, weightKg: 65, reps: 8 },
      ]);

      const res = await porExercicio(tokenA, supinoId).expect(200);

      expect(res.body.exercise).toMatchObject({
        id: supinoId,
        name: "Supino reto",
      });
      expect(res.body.points).toHaveLength(1);
      expect(res.body.points[0]).toMatchObject({
        maxWeightKg: 65,
        volume: 1120, // 60×10 + 65×8
        totalReps: 18,
        setCount: 2,
      });
    });

    it("volume e null (nao 0) quando o exercicio e so de peso corporal", async () => {
      await treino(tokenA, planDayA, [
        { exerciseId: barraId, setNumber: 1, weightKg: null, reps: 12 },
        { exerciseId: barraId, setNumber: 2, weightKg: null, reps: 10 },
      ]);

      const res = await porExercicio(tokenA, barraId).expect(200);

      // 0 seria mentira: nao e "levantou nada", e "nao havia carga a levantar".
      expect(res.body.points[0].volume).toBeNull();
      expect(res.body.points[0].maxWeightKg).toBeNull();
      expect(res.body.points[0].totalReps).toBe(22);
    });

    it("ignora a sessao ainda aberta", async () => {
      const aberta = await abreSessao(tokenA, planDayA).expect(200);
      await registraSerie(tokenA, aberta.body.id, {
        exerciseId: supinoId,
        setNumber: 1,
        weightKg: 100,
        reps: 5,
      }).expect(200);

      const res = await porExercicio(tokenA, supinoId).expect(200);

      expect(res.body.points).toEqual([]);
    });

    it("ordena os pontos do mais antigo pro mais novo", async () => {
      await treino(
        tokenA,
        planDayA,
        [{ exerciseId: supinoId, setNumber: 1, weightKg: 60, reps: 10 }],
        new Date("2026-05-01T12:00:00Z"),
      );
      await treino(
        tokenA,
        planDayA,
        [{ exerciseId: supinoId, setNumber: 1, weightKg: 70, reps: 10 }],
        new Date("2026-06-01T12:00:00Z"),
      );

      const res = await porExercicio(tokenA, supinoId).expect(200);

      expect(
        res.body.points.map((p: { maxWeightKg: number }) => p.maxWeightKg),
      ).toEqual([60, 70]);
    });

    it("rejeita exercicio inexistente com 404", async () => {
      await porExercicio(tokenA, "nao-existe").expect(404);
    });

    it("exige autenticacao", async () => {
      await request(app.getHttpServer())
        .get(`/api/progress/exercise/${supinoId}`)
        .expect(401);
    });
  });

  // Este bloco e a razao de o parametro tz existir.
  describe("GET /progress/summary — fuso horario", () => {
    it("treino de domingo 23h em SP conta na semana de domingo, nao na seguinte", async () => {
      // Domingo 12/07/2026 23h em Sao Paulo (UTC-3) == segunda 13/07 02h UTC.
      await treino(
        tokenA,
        planDayA,
        [{ exerciseId: supinoId, setNumber: 1, weightKg: 60, reps: 10 }],
        new Date("2026-07-13T02:00:00Z"),
      );

      const emSP = await summary(tokenA, SP).expect(200);
      const emUTC = await summary(tokenA, "UTC").expect(200);

      // Em SP a semana comeca na segunda 06/07 local == 06/07 03:00Z.
      expect(emSP.body.weeklyVolume).toHaveLength(1);
      expect(emSP.body.weeklyVolume[0].weekStart).toBe(
        "2026-07-06T03:00:00.000Z",
      );

      // Em UTC o mesmo instante cai na segunda 13/07 — semana seguinte. E o bug
      // que o tz evita: sem ele o usuario veria o treino na semana errada.
      expect(emUTC.body.weeklyVolume[0].weekStart).toBe(
        "2026-07-13T00:00:00.000Z",
      );
    });

    it("rejeita fuso invalido com 400, e nao 500", async () => {
      await summary(tokenA, "Nao/Existe").expect(400);
    });

    it("exige o tz", async () => {
      await request(app.getHttpServer())
        .get("/api/progress/summary")
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(400);
    });
  });

  describe("GET /progress/summary — volume semanal", () => {
    it("soma o volume das sessoes da semana e conta os treinos", async () => {
      const semana = new Date("2026-07-08T14:00:00Z");
      await treino(
        tokenA,
        planDayA,
        [{ exerciseId: supinoId, setNumber: 1, weightKg: 60, reps: 10 }],
        semana,
      );
      await treino(
        tokenA,
        planDayA,
        [{ exerciseId: supinoId, setNumber: 1, weightKg: 50, reps: 10 }],
        semana,
      );

      const res = await summary(tokenA).expect(200);

      expect(res.body.weeklyVolume).toHaveLength(1);
      expect(res.body.weeklyVolume[0]).toMatchObject({
        volume: 1100, // 600 + 500
        sessionCount: 2,
      });
    });

    it("semana so de peso corporal aparece com volume 0, e nao some", async () => {
      await treino(
        tokenA,
        planDayA,
        [{ exerciseId: barraId, setNumber: 1, weightKg: null, reps: 12 }],
        new Date("2026-07-08T14:00:00Z"),
      );

      const res = await summary(tokenA).expect(200);

      // O treino aconteceu: a barra some do grafico, mas a contagem nao.
      expect(res.body.weeklyVolume).toHaveLength(1);
      expect(res.body.weeklyVolume[0]).toMatchObject({
        volume: 0,
        sessionCount: 1,
      });
    });

    it("nao conta a sessao aberta em totalSessions", async () => {
      await abreSessao(tokenA, planDayA).expect(200);

      const res = await summary(tokenA).expect(200);

      expect(res.body.totalSessions).toBe(0);
    });

    it("devolve vazio pra quem nunca treinou", async () => {
      const res = await summary(tokenA).expect(200);

      expect(res.body).toEqual({
        weeklyVolume: [],
        records: [],
        totalSessions: 0,
      });
    });
  });

  describe("GET /progress/summary — PRs", () => {
    it("registra a maior carga e o maior volume do exercicio", async () => {
      // Treino 1: carga menor, volume maior.
      await treino(
        tokenA,
        planDayA,
        [
          { exerciseId: supinoId, setNumber: 1, weightKg: 60, reps: 12 },
          { exerciseId: supinoId, setNumber: 2, weightKg: 60, reps: 12 },
        ],
        new Date("2026-06-01T12:00:00Z"),
      );
      // Treino 2: carga maior, volume menor. Os dois PRs caem em treinos
      // diferentes de proposito — e isso que prova serem agregacoes distintas.
      await treino(
        tokenA,
        planDayA,
        [{ exerciseId: supinoId, setNumber: 1, weightKg: 90, reps: 3 }],
        new Date("2026-06-08T12:00:00Z"),
      );

      const res = await summary(tokenA).expect(200);
      const pr = prDoSupino(res.body);

      expect(pr).toMatchObject({
        maxWeightKg: 90,
        maxWeightDate: "2026-06-08T12:00:00.000Z",
        maxVolume: 1440, // 60×12 + 60×12
        maxVolumeDate: "2026-06-01T12:00:00.000Z",
      });
    });

    it("o PR aponta pra primeira vez que a carga foi atingida", async () => {
      await treino(
        tokenA,
        planDayA,
        [{ exerciseId: supinoId, setNumber: 1, weightKg: 80, reps: 5 }],
        new Date("2026-06-01T12:00:00Z"),
      );
      // Repetir a mesma carga depois nao rouba a data do feito original.
      await treino(
        tokenA,
        planDayA,
        [{ exerciseId: supinoId, setNumber: 1, weightKg: 80, reps: 5 }],
        new Date("2026-06-15T12:00:00Z"),
      );

      const res = await summary(tokenA).expect(200);

      expect(prDoSupino(res.body)).toMatchObject({
        maxWeightDate: "2026-06-01T12:00:00.000Z",
      });
    });

    it("exercicio so de peso corporal nao entra na lista de PRs", async () => {
      await treino(tokenA, planDayA, [
        { exerciseId: barraId, setNumber: 1, weightKg: null, reps: 15 },
      ]);

      const res = await summary(tokenA).expect(200);

      expect(res.body.records).toEqual([]);
    });

    it("ignora as series da sessao aberta", async () => {
      await treino(tokenA, planDayA, [
        { exerciseId: supinoId, setNumber: 1, weightKg: 60, reps: 10 },
      ]);
      const aberta = await abreSessao(tokenA, planDayA).expect(200);
      await registraSerie(tokenA, aberta.body.id, {
        exerciseId: supinoId,
        setNumber: 1,
        weightKg: 200,
        reps: 1,
      }).expect(200);

      const res = await summary(tokenA).expect(200);

      // 200kg nao virou recorde: o treino ainda nao acabou.
      expect(prDoSupino(res.body)).toMatchObject({ maxWeightKg: 60 });
    });
  });

  describe("POST /metrics · GET /metrics", () => {
    /**
     * Corpo completo com tudo nulo, ligando so o que o teste precisa.
     *
     * Todo campo e nullable mas obrigatorio (a convencao do app, ver
     * session.ts:23): o cliente diz explicitamente "nao medi" em vez de omitir.
     * Sem este helper, cada medida nova quebraria todo teste daqui.
     */
    function corpo(over: Record<string, unknown> = {}) {
      return {
        weightKg: null,
        bodyFat: null,
        leanMassKg: null,
        waistCm: null,
        armCm: null,
        chestCm: null,
        thighCm: null,
        notes: null,
        ...over,
      };
    }

    function cria(token: string, body: object) {
      return request(app.getHttpServer())
        .post("/api/metrics")
        .set("Authorization", `Bearer ${token}`)
        .send(body);
    }

    function lista(token: string) {
      return request(app.getHttpServer())
        .get("/api/metrics")
        .set("Authorization", `Bearer ${token}`);
    }

    it("registra o peso e devolve na listagem", async () => {
      await cria(tokenA, corpo({ weightKg: 82.5, bodyFat: 18.2 })).expect(201);

      const res = await lista(tokenA).expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ weightKg: 82.5, bodyFat: 18.2 });
    });

    it("aceita so o peso, sem bodyFat", async () => {
      await cria(tokenA, corpo({ weightKg: 80 })).expect(201);
    });

    it("registra a composicao corporal inteira", async () => {
      await cria(
        tokenA,
        corpo({
          weightKg: 82.5,
          bodyFat: 18.2,
          leanMassKg: 67.5,
          waistCm: 84,
          armCm: 38,
          chestCm: 104,
          thighCm: 58,
        }),
      ).expect(201);

      const res = await lista(tokenA).expect(200);

      expect(res.body[0]).toMatchObject({
        leanMassKg: 67.5,
        waistCm: 84,
        armCm: 38,
        chestCm: 104,
        thighCm: 58,
      });
    });

    it("aceita so medidas de fita, sem peso", async () => {
      // Quem passa a fita nao necessariamente sobe na balanca no mesmo dia.
      await cria(tokenA, corpo({ waistCm: 84, armCm: 38 })).expect(201);
    });

    it("rejeita registro totalmente vazio com 400", async () => {
      await cria(tokenA, corpo()).expect(400);
    });

    it("rejeita peso fora do range com 400", async () => {
      await cria(tokenA, corpo({ weightKg: 900 })).expect(400);
    });

    it("rejeita medida de fita fora do range com 400", async () => {
      await cria(tokenA, corpo({ waistCm: 800 })).expect(400);
    });

    it("rejeita corpo sem os campos obrigatorios com 400", async () => {
      // Nullable, mas obrigatorio: omitir o campo nao e o mesmo que dizer null.
      await cria(tokenA, { weightKg: 80 }).expect(400);
    });

    it("lista da mais recente pra mais antiga", async () => {
      await cria(tokenA, corpo({ weightKg: 80 })).expect(201);
      await cria(tokenA, corpo({ weightKg: 81 })).expect(201);

      const res = await lista(tokenA).expect(200);

      expect(res.body[0].weightKg).toBe(81);
    });

    it("exige autenticacao", async () => {
      await request(app.getHttpServer()).get("/api/metrics").expect(401);
    });
  });

  // Progresso e dado pessoal, e o vazamento aqui nao precisa de id adivinhado:
  // basta um token valido batendo num endpoint que esqueceu o userId no where.
  describe("Isolamento entre usuarios", () => {
    it("nao mostra o progresso de outro usuario no exercise", async () => {
      await treino(tokenB, planDayB, [
        { exerciseId: supinoId, setNumber: 1, weightKg: 100, reps: 10 },
      ]);

      const res = await porExercicio(tokenA, supinoId).expect(200);

      expect(res.body.points).toEqual([]);
    });

    it("nao mistura os PRs de outro usuario no summary", async () => {
      await treino(tokenB, planDayB, [
        { exerciseId: supinoId, setNumber: 1, weightKg: 150, reps: 5 },
      ]);
      await treino(tokenA, planDayA, [
        { exerciseId: supinoId, setNumber: 1, weightKg: 60, reps: 10 },
      ]);

      const res = await summary(tokenA).expect(200);

      expect(prDoSupino(res.body)).toMatchObject({ maxWeightKg: 60 });
      expect(res.body.totalSessions).toBe(1);
    });

    it("nao vaza as metricas de outro usuario", async () => {
      await request(app.getHttpServer())
        .post("/api/metrics")
        .set("Authorization", `Bearer ${tokenB}`)
        .send({
          weightKg: 95,
          bodyFat: null,
          leanMassKg: null,
          waistCm: null,
          armCm: null,
          chestCm: null,
          thighCm: null,
          notes: null,
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/api/metrics")
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe("GET /progress/streak", () => {
    // ISO de hoje em UTC — o mesmo fuso mandado na query, pra o teste ser
    // deterministico independente de quando roda.
    const isoHoje = (() => {
      const d = new Date().getUTCDay();
      return d === 0 ? 7 : d;
    })();
    let tokenS = "";
    let planDayS = "";

    async function criaPlanoAgendado(
      token: string,
      weekday: number,
    ): Promise<string> {
      const res = await request(app.getHttpServer())
        .post("/api/plans")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Streak",
          notes: null,
          days: [
            {
              name: "Dia",
              focus: null,
              weekday,
              exercises: [
                {
                  exerciseId: supinoId,
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
      await request(app.getHttpServer())
        .put(`/api/plans/${res.body.id}/activate`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      return res.body.days[0].id as string;
    }

    function streak(token: string, tz = "UTC") {
      return request(app.getHttpServer())
        .get("/api/progress/streak")
        .query({ tz })
        .set("Authorization", `Bearer ${token}`);
    }

    beforeAll(async () => {
      tokenS = await register(`streak-${Date.now()}@teste.com`);
      planDayS = await criaPlanoAgendado(tokenS, isoHoje);
    });

    it("sem plano ativo agendado devolve unscheduled", async () => {
      const semAgenda = await register(`streak-none-${Date.now()}@teste.com`);
      const res = await streak(semAgenda).expect(200);
      expect(res.body.state).toBe("unscheduled");
      expect(res.body.current).toBe(0);
    });

    it("treinar hoje no dia agendado deixa a sequencia ativa", async () => {
      await treino(tokenS, planDayS, [
        { exerciseId: supinoId, setNumber: 1, weightKg: 60, reps: 10 },
      ]);

      const res = await streak(tokenS).expect(200);

      expect(res.body.scheduledToday).toBe(true);
      expect(res.body.trainedToday).toBe(true);
      expect(res.body.current).toBe(1);
      expect(res.body.state).toBe("active");
    });

    it("exige autenticacao", async () => {
      await request(app.getHttpServer())
        .get("/api/progress/streak")
        .query({ tz: "UTC" })
        .expect(401);
    });
  });
});
