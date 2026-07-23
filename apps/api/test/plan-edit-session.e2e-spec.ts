import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

const PASSWORD = "senha-de-teste-123";
const TZ = "America/Sao_Paulo";

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

/**
 * Editar um plano no meio de um treino.
 *
 * O bug que originou estes testes: o update apaga e recria os PlanDay, a FK da
 * sessao vira null (onDelete: SetNull) e ela fica ABERTA sem dia. O painel
 * oferecia "continuar treino" pra sempre e nao havia caminho nenhum pra
 * encerrar — nem refazer o treino resolvia, porque isso criava outra sessao e a
 * orfa continuava sendo a unica aberta.
 *
 * Contra Postgres de verdade de proposito: os testes unitarios de
 * plans.service.spec.ts usam fake do Prisma e provam a DECISAO (re-aponta,
 * encerra ou apaga); estes provam que as escritas acontecem mesmo e que o
 * estado resultante e o que o resto do app le.
 */
describe("Editar plano durante treino (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token = "";
  let exerciseId = "";
  let outroExerciseId = "";

  /** Plano de dois dias: e o que permite REMOVER um deles no update. */
  function planoDeDoisDias() {
    return {
      name: "Push/Pull",
      notes: null,
      days: [
        {
          name: "Push",
          focus: null,
          weekday: null,
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
          weekday: null,
          exercises: [
            { exerciseId, sets: 3, repScheme: "8", restSec: 90, notes: null },
          ],
        },
      ],
    };
  }

  /** So o "Push": faz o "Pull" (order 1) sumir — nome nao casa, order nao casa. */
  function planoSoComPush() {
    const plano = planoDeDoisDias();
    return { ...plano, days: [plano.days[0]] };
  }

  async function criaPlano(
    body: object,
  ): Promise<{ planId: string; dayIds: string[] }> {
    const res = await request(app.getHttpServer())
      .post("/api/plans")
      .set("Authorization", `Bearer ${token}`)
      .send(body)
      .expect(201);
    return {
      planId: res.body.id as string,
      dayIds: res.body.days.map((d: { id: string }) => d.id) as string[],
    };
  }

  async function iniciaSessao(planDayId: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/api/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ planDayId })
      .expect(200);
    return res.body.id as string;
  }

  async function registraSerie(sessionId: string): Promise<void> {
    await request(app.getHttpServer())
      .post(`/api/sessions/${sessionId}/logs`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        exerciseId,
        setNumber: 1,
        weightKg: 60,
        reps: 10,
        rpe: null,
        completed: true,
      })
      .expect(200);
  }

  async function editaPlano(planId: string, body: object): Promise<void> {
    await request(app.getHttpServer())
      .put(`/api/plans/${planId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(body)
      .expect(200);
  }

  /**
   * O corpo `null` do endpoint chega como `{}` no supertest, entao `?? null`
   * nao basta — a ausencia de sessao se reconhece pela falta do id.
   */
  async function sessaoAtiva(): Promise<Record<string, unknown> | null> {
    const res = await request(app.getHttpServer())
      .get("/api/sessions/active")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const body = res.body as Record<string, unknown> | null;
    return typeof body?.id === "string" ? body : null;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    // Espelha o bootstrap real (src/main.ts), senao as rotas nao batem.
    app.setGlobalPrefix("api");
    await app.init();
    prisma = app.get(PrismaService);

    await limpaTudo(prisma);

    const [a, b] = await Promise.all([
      prisma.exercise.create({
        data: {
          slug: "e2e-edit-supino",
          name: "Supino reto",
          muscleGroup: "CHEST",
          category: "COMPOUND",
          equipment: "BARBELL",
          defaultRestSec: 120,
        },
      }),
      prisma.exercise.create({
        data: {
          slug: "e2e-edit-remada",
          name: "Remada curvada",
          muscleGroup: "BACK",
          category: "COMPOUND",
          equipment: "BARBELL",
          defaultRestSec: 120,
        },
      }),
    ]);
    exerciseId = a.id;
    outroExerciseId = b.id;

    const res = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email: "edicao-plano@e2e.local", password: PASSWORD, name: null })
      .expect(201);
    token = res.body.token as string;
  });

  beforeEach(async () => {
    // Limpa so o que cada teste cria; usuario e exercicios sobrevivem.
    await prisma.setLog.deleteMany();
    await prisma.workoutSession.deleteMany();
    await prisma.planExercise.deleteMany();
    await prisma.planDay.deleteMany();
    await prisma.workoutPlan.deleteMany();
  });

  afterAll(async () => {
    await limpaTudo(prisma);
    await app.close();
  });

  it("re-aponta a sessao em andamento para o dia recriado", async () => {
    const { planId, dayIds } = await criaPlano(planoDeDoisDias());
    const sessionId = await iniciaSessao(dayIds[0]);
    await registraSerie(sessionId);

    // Adiciona o exercicio que faltava — o motivo real de editar no meio.
    const comExercicioNovo = planoDeDoisDias();
    comExercicioNovo.days[0].exercises.push({
      exerciseId: outroExerciseId,
      sets: 4,
      repScheme: "10",
      restSec: 60,
      notes: null,
    });
    await editaPlano(planId, comExercicioNovo);

    const ativa = await sessaoAtiva();
    expect(ativa).not.toBeNull();
    // Mesma sessao, nao uma nova: a serie registrada continua nela.
    expect(ativa?.id).toBe(sessionId);
    expect(ativa?.planDayId).not.toBeNull();
    expect(ativa?.setLogs).toHaveLength(1);
    // ...e ja enxerga a prescricao nova, com os dois exercicios.
    expect(
      (ativa?.planDay as { exercises: unknown[] } | null)?.exercises,
    ).toHaveLength(2);
  });

  it("encerra a sessao COM series quando o dia foi removido do plano", async () => {
    const { planId, dayIds } = await criaPlano(planoDeDoisDias());
    // Treina o "Pull" (order 1) — o dia que vai sumir.
    const sessionId = await iniciaSessao(dayIds[1]);
    await registraSerie(sessionId);

    await editaPlano(planId, planoSoComPush());

    // Nao trava o painel...
    expect(await sessaoAtiva()).toBeNull();

    // ...e o treino que a pessoa fez de verdade nao sumiu.
    const sessao = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: { _count: { select: { setLogs: true } } },
    });
    expect(sessao?.finishedAt).not.toBeNull();
    expect(sessao?._count.setLogs).toBe(1);
  });

  it("apaga a sessao VAZIA quando o dia foi removido do plano", async () => {
    const { planId, dayIds } = await criaPlano(planoDeDoisDias());
    // Abriu o treino e nao registrou nada antes de ir editar o plano.
    const sessionId = await iniciaSessao(dayIds[1]);

    await editaPlano(planId, planoSoComPush());

    expect(await sessaoAtiva()).toBeNull();
    expect(
      await prisma.workoutSession.findUnique({ where: { id: sessionId } }),
    ).toBeNull();
  });

  /**
   * A sessao vazia e APAGADA, nao encerrada — e esta e a razao.
   *
   * A sequencia e o /progress contam qualquer sessao com finishedAt preenchido,
   * sem olhar se ha serie registrada (progress/streak-query.ts). Encerrar a
   * vazia daria ao usuario um dia de treino que ele nunca fez, e depois nao
   * haveria como distinguir o dia fabricado do legitimo.
   */
  it("nao inventa treino cumprido a partir da sessao vazia", async () => {
    const { planId, dayIds } = await criaPlano(planoDeDoisDias());
    await iniciaSessao(dayIds[1]);

    await editaPlano(planId, planoSoComPush());

    const summary = await request(app.getHttpServer())
      .get(`/api/progress/summary?tz=${encodeURIComponent(TZ)}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(summary.body.totalSessions).toBe(0);

    const streak = await request(app.getHttpServer())
      .get(`/api/progress/streak?tz=${encodeURIComponent(TZ)}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(streak.body.current).toBe(0);
  });

  it("nao toca em sessao de plano que nao foi editado", async () => {
    const intocado = await criaPlano({
      ...planoDeDoisDias(),
      name: "Plano intocado",
    });
    const { planId } = await criaPlano(planoDeDoisDias());
    const sessionId = await iniciaSessao(intocado.dayIds[0]);
    await registraSerie(sessionId);

    await editaPlano(planId, planoSoComPush());

    const ativa = await sessaoAtiva();
    expect(ativa?.id).toBe(sessionId);
    expect(ativa?.planDayId).toBe(intocado.dayIds[0]);
  });
});
