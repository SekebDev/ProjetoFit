import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { ACHIEVEMENTS } from "../src/game/catalog";
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
  // GameProfile e UserAchievement caem junto com o User (onDelete: Cascade).
  await prisma.user.deleteMany();
  await prisma.exercise.deleteMany();
}

/**
 * Garante o catalogo no banco.
 *
 * O seed ja faz isto, mas depender dele deixaria o teste verde ou vermelho
 * conforme a ordem em que os comandos foram rodados na maquina.
 */
async function semeiaCatalogo(prisma: PrismaService): Promise<void> {
  for (const a of ACHIEVEMENTS) {
    const dados = {
      code: a.code,
      name: a.name,
      description: a.description,
      icon: a.icon,
      xpReward: a.xpReward,
    };
    await prisma.achievement.upsert({
      where: { code: a.code },
      create: dados,
      update: dados,
    });
  }
}

describe("Game (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token = "";
  let supinoId = "";
  let planId = "";
  let planDayId = "";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await limpaTudo(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await limpaTudo(prisma);
    await semeiaCatalogo(prisma);

    const exercicio = await prisma.exercise.create({
      data: {
        slug: "supino-game",
        name: "Supino",
        muscleGroup: "CHEST",
        category: "COMPOUND",
        equipment: "BARBELL",
      },
    });
    supinoId = exercicio.id;

    const registro = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({
        email: `game-${Date.now()}@teste.com`,
        password: PASSWORD,
        name: null,
      })
      .expect(201);
    token = registro.body.token as string;

    const plano = await request(app.getHttpServer())
      .post("/api/plans")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Plano",
        notes: null,
        days: [
          {
            name: "Push",
            focus: null,
            // Sem dia da semana: o plano nao fica agendado, entao a sequencia
            // sai "unscheduled" com current 0 e o multiplicador e 1. E o que
            // torna a conta de XP previsivel nestes testes.
            weekday: null,
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
    planId = plano.body.id as string;
    planDayId = plano.body.days[0].id as string;
  });

  /**
   * ISO 1=segunda..7=domingo de hoje no fuso do teste — a mesma conta que o
   * streak.ts faz. Serve pra agendar o plano pro dia de hoje sem depender de
   * qual dia da semana o teste roda.
   */
  function isoWeekdayHoje(): number {
    // en-CA formata como YYYY-MM-DD, que e o formato que o resto da regra usa.
    const hoje = new Date().toLocaleDateString("en-CA", { timeZone: SP });
    const [ano, mes, dia] = hoje.split("-").map(Number);
    const dow = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
    return dow === 0 ? 7 : dow;
  }

  /**
   * Deixa o plano ativo e agendado pra hoje, pra sequencia sair de "unscheduled"
   * e passar a valer. Sem isto o multiplicador de XP e sempre 1.
   */
  async function agendaParaHoje(): Promise<void> {
    await prisma.workoutPlan.update({
      where: { id: planId },
      data: { isActive: true },
    });
    await prisma.planDay.update({
      where: { id: planDayId },
      data: { weekday: isoWeekdayHoje() },
    });
  }

  interface Serie {
    weightKg: number;
    reps: number;
  }

  /** A serie padrao dos testes que nao se importam com carga nem repeticoes. */
  const SERIE: Serie = { weightKg: 60, reps: 10 };

  /** Abre a sessao, registra as series e devolve o id — sem encerrar. */
  async function iniciaComSeries(series: Serie[]): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/api/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ planDayId })
      .expect(200);
    const sessionId = res.body.id as string;

    for (const [i, serie] of series.entries()) {
      await request(app.getHttpServer())
        .post(`/api/sessions/${sessionId}/logs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          exerciseId: supinoId,
          setNumber: i + 1,
          weightKg: serie.weightKg,
          reps: serie.reps,
          rpe: null,
          completed: true,
        })
        .expect(200);
    }
    return sessionId;
  }

  function encerra(sessionId: string) {
    return request(app.getHttpServer())
      .patch(`/api/sessions/${sessionId}/finish`)
      .set("Authorization", `Bearer ${token}`)
      .send({ notes: null, tz: SP });
  }

  function buscaGame() {
    return request(app.getHttpServer())
      .get("/api/game")
      .set("Authorization", `Bearer ${token}`);
  }

  describe("GET /game", () => {
    it("exige autenticacao", async () => {
      await request(app.getHttpServer()).get("/api/game").expect(401);
    });

    it("comeca zerado no nivel 1, sem criar perfil", async () => {
      const res = await buscaGame().expect(200);

      expect(res.body).toEqual({
        xp: 0,
        level: 1,
        xpIntoLevel: 0,
        xpForNextLevel: 100,
      });
      // Leitura nao escreve: o perfil so nasce quando ha o que creditar.
      expect(await prisma.gameProfile.count()).toBe(0);
    });

    it("credita XP ao encerrar o treino", async () => {
      const sessionId = await iniciaComSeries([SERIE, SERIE]);

      const fim = await encerra(sessionId).expect(200);

      // 50 de base + 5 por serie x2 = 60. Sem PR (estreia do exercicio nao
      // conta) e sem bonus (plano sem dias agendados). Mais 50 do primeiro
      // treino = 110.
      expect(fim.body.reward.xpGained).toBe(110);
      expect(fim.body.reward.xpFromAchievements).toBe(50);
      expect(fim.body.reward.streakBonus).toBe(0);
      expect(fim.body.reward.leveledUp).toBe(true);
      expect(fim.body.reward.levelAfter).toBe(2);
      expect(
        fim.body.reward.unlocked.map((a: { code: string }) => a.code),
      ).toEqual(["FIRST_WORKOUT"]);

      const game = await buscaGame().expect(200);
      expect(game.body.xp).toBe(110);
      expect(game.body.level).toBe(2);
    });

    it("NAO paga o mesmo treino duas vezes", async () => {
      const sessionId = await iniciaComSeries([SERIE, SERIE]);

      const primeira = await encerra(sessionId).expect(200);
      const segunda = await encerra(sessionId).expect(200);

      expect(primeira.body.reward).not.toBeNull();
      expect(segunda.body.reward).toBeNull();

      // O XP nao andou no retry — a guarda do finish e o que garante isto.
      const game = await buscaGame().expect(200);
      expect(game.body.xp).toBe(primeira.body.reward.xpGained);
    });

    it("conta como PR o treino que superou a carga anterior", async () => {
      await encerra(await iniciaComSeries([SERIE])).expect(200);
      const segundo = await encerra(await iniciaComSeries([{ weightKg: 70, reps: 10 }])).expect(200);

      // A primeira sessao nao teve PR (nao havia com o que comparar); a segunda
      // superou os 60kg. Sessao: 50 de base + 5 de uma serie + 25 do PR = 80.
      // E o PR desbloqueia a conquista FIRST_PR, que paga mais 75.
      expect(segundo.body.reward.xpGained).toBe(155);
      expect(segundo.body.reward.xpFromAchievements).toBe(75);
      expect(
        segundo.body.reward.unlocked.map((a: { code: string }) => a.code),
      ).toEqual(["FIRST_PR"]);
    });

    it("conta PR quando a carga empata e as repeticoes sobem", async () => {
      // A regra tem que casar com a do cliente (web lib/rackie/pr.ts), que
      // comemora 60kg×10 depois de 60kg×8. Antes deste caso o servidor so
      // comparava carga: a Rackie festejava e o XP nao vinha.
      await encerra(await iniciaComSeries([{ weightKg: 60, reps: 8 }])).expect(
        200,
      );
      const segundo = await encerra(
        await iniciaComSeries([{ weightKg: 60, reps: 10 }]),
      ).expect(200);

      // 50 + 5 + 25 do PR = 80, mais os 75 do FIRST_PR.
      expect(segundo.body.reward.xpGained).toBe(155);
    });

    it("NAO conta PR quando a carga empata e as repeticoes caem", async () => {
      await encerra(await iniciaComSeries([{ weightKg: 60, reps: 10 }])).expect(
        200,
      );
      const segundo = await encerra(
        await iniciaComSeries([{ weightKg: 60, reps: 8 }]),
      ).expect(200);

      // So a base + a serie: 55. Sem PR, sem conquista nova.
      expect(segundo.body.reward.xpGained).toBe(55);
      expect(segundo.body.reward.unlocked).toEqual([]);
    });

    it("multiplica o XP pela sequencia", async () => {
      await agendaParaHoje();

      const fim = await encerra(
        await iniciaComSeries([{ weightKg: 60, reps: 10 }]),
      ).expect(200);

      // Treinou o dia agendado de hoje: sequencia 1, bonus de 2%.
      expect(fim.body.reward.streakBonus).toBeCloseTo(0.02, 10);
      // (50 de base + 5 da serie) x 1,02 = 56,1 -> 56. Mais 50 do primeiro
      // treino = 106. Sem o multiplicador chegando na conta daria 105.
      expect(fim.body.reward.xpGained).toBe(106);
    });
  });

  describe("GET /game/achievements", () => {
    function buscaConquistas() {
      return request(app.getHttpServer())
        .get(`/api/game/achievements?tz=${encodeURIComponent(SP)}`)
        .set("Authorization", `Bearer ${token}`);
    }

    it("exige autenticacao", async () => {
      await request(app.getHttpServer())
        .get("/api/game/achievements")
        .expect(401);
    });

    it("devolve o catalogo inteiro, tudo bloqueado no comeco", async () => {
      const res = await buscaConquistas().expect(200);

      expect(res.body).toHaveLength(ACHIEVEMENTS.length);
      expect(
        res.body.every(
          (a: { unlockedAt: string | null }) => a.unlockedAt === null,
        ),
      ).toBe(true);
    });

    it("marca a desbloqueada e mostra o progresso das demais", async () => {
      await encerra(await iniciaComSeries([SERIE])).expect(200);

      const res = await buscaConquistas().expect(200);
      const porCode = new Map(
        res.body.map((a: { code: string }) => [a.code, a]),
      );

      const primeiro = porCode.get("FIRST_WORKOUT") as {
        unlockedAt: string | null;
        progress: number;
      };
      expect(primeiro.unlockedAt).not.toBeNull();
      expect(primeiro.progress).toBe(1);

      // A de 10 treinos continua bloqueada, mas ja mostra 1 de 10.
      const dez = porCode.get("WORKOUTS_10") as {
        unlockedAt: string | null;
        progress: number;
        target: number;
      };
      expect(dez.unlockedAt).toBeNull();
      expect(dez.progress).toBe(1);
      expect(dez.target).toBe(10);
    });

    it("nao desbloqueia a mesma conquista duas vezes", async () => {
      await encerra(await iniciaComSeries([SERIE])).expect(200);
      const segundo = await encerra(await iniciaComSeries([SERIE])).expect(200);

      // O segundo treino nao redesbloqueia o primeiro treino.
      expect(segundo.body.reward.unlocked).toEqual([]);
      expect(await prisma.userAchievement.count()).toBe(1);
    });
  });
});
