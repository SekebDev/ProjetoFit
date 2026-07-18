import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { Achievement, Game, SessionReward } from "@workout/shared";
import { PrismaService } from "../prisma/prisma.service";
import { loadStreak } from "../progress/streak-query";
import { ACHIEVEMENTS, type AchievementDef } from "./catalog";
import { evaluateUnlocks, progressFor, type UnlockStats } from "./unlock";
import { computeSessionXp, levelFor, streakBonusFor, xpForLevel } from "./xp";

/** Antes das 6h da manha o treino conta como madrugada. */
const HORA_MADRUGADOR = 6;

interface TotaisRow {
  sessions: number;
  volume: number;
  earlyBird: number;
}

interface PrRow {
  total: number;
  nesta: number;
}

/**
 * Recordes pessoais do usuario, no total e nesta sessao.
 *
 * Um PR e uma sessao cuja melhor serie de um exercicio superou o recorde
 * daquele exercicio em TODAS as sessoes anteriores. "Melhor" e lexicografico:
 * carga primeiro, repeticoes no desempate — 60kg×10 bate 60kg×8.
 *
 * O `ARRAY[peso, reps]` e o que da o lexicografico de graca: o Postgres compara
 * array elemento a elemento, entao MAX() sobre ele ja devolve a melhor dupla. O
 * cast pra float8 e obrigatorio porque um array so aceita um tipo.
 *
 * A janela `ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING` e o que da o
 * "anteriores": o recorde corrente sem contar a propria linha. E
 * `anterior IS NOT NULL` exclui a estreia de proposito — a primeira vez que
 * voce faz um exercicio nao e recorde, e so uma primeira vez.
 *
 * Esta regra e espelhada no cliente (web lib/rackie/pr.ts), que precisa decidir
 * PR na hora de registrar a serie, antes de existir sessao encerrada pra
 * consultar. As duas TEM que concordar: e aqui que se paga o XP, e la que a
 * Rackie comemora. Se divergirem, ela comemora um PR que nao pagou nada.
 */
function prQuery(
  client: Prisma.TransactionClient,
  userId: string,
  sessionId: string,
): Promise<PrRow[]> {
  return client.$queryRaw<PrRow[]>`
    WITH por_sessao AS (
      SELECT sl."exerciseId" AS exercise_id,
             s.id            AS session_id,
             s.date          AS data,
             MAX(ARRAY[sl."weightKg", COALESCE(sl.reps, 0)::float8])
                             AS melhor
      FROM "SetLog" sl
      JOIN "WorkoutSession" s ON s.id = sl."sessionId"
      WHERE s."userId" = ${userId}
        AND s."finishedAt" IS NOT NULL
        AND sl.completed
        AND sl."weightKg" IS NOT NULL
      GROUP BY sl."exerciseId", s.id, s.date
    ),
    com_recorde AS (
      SELECT p.*,
             MAX(p.melhor) OVER (
               PARTITION BY p.exercise_id
               ORDER BY p.data, p.session_id
               ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
             ) AS anterior
      FROM por_sessao p
    )
    SELECT count(*)::int AS "total",
           count(*) FILTER (WHERE session_id = ${sessionId})::int AS "nesta"
    FROM com_recorde
    WHERE anterior IS NOT NULL AND melhor > anterior
  `;
}

function totaisQuery(
  client: Prisma.TransactionClient,
  userId: string,
  tz: string,
): Promise<TotaisRow[]> {
  return client.$queryRaw<TotaisRow[]>`
    SELECT
      (SELECT count(*)::int
         FROM "WorkoutSession"
        WHERE "userId" = ${userId} AND "finishedAt" IS NOT NULL
      ) AS "sessions",
      COALESCE((
        SELECT sum(sl.reps * sl."weightKg")
          FROM "SetLog" sl
          JOIN "WorkoutSession" s ON s.id = sl."sessionId"
         WHERE s."userId" = ${userId}
           AND s."finishedAt" IS NOT NULL
           AND sl.completed
      ), 0)::float8 AS "volume",
      (SELECT count(*)::int
         FROM "WorkoutSession" s
        WHERE s."userId" = ${userId}
          AND s."finishedAt" IS NOT NULL
          AND EXTRACT(
                HOUR FROM (s.date AT TIME ZONE 'UTC') AT TIME ZONE ${tz}
              ) < ${HORA_MADRUGADOR}
      ) AS "earlyBird"
  `;
}

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * As metricas que o catalogo consulta, mais a sequencia atual.
   *
   * A contagem de PRs desta sessao sai junto na mesma query dos PRs totais — o
   * finish precisa dos dois numeros e nao ha porque bater no banco duas vezes.
   */
  private async loadStats(
    client: Prisma.TransactionClient,
    userId: string,
    tz: string,
    sessionId: string,
  ): Promise<{ stats: UnlockStats; prsNestaSessao: number; streak: number }> {
    const [[totais], [prs], streak] = await Promise.all([
      totaisQuery(client, userId, tz),
      prQuery(client, userId, sessionId),
      loadStreak(client, userId, tz),
    ]);

    return {
      stats: {
        sessions: totais.sessions,
        streakBest: streak.best,
        prs: prs.total,
        volume: totais.volume,
        earlyBird: totais.earlyBird,
      },
      prsNestaSessao: prs.nesta,
      streak: streak.current,
    };
  }

  /** Quando cada conquista do usuario foi desbloqueada, indexado por `code`. */
  private async unlockedAt(
    client: Prisma.TransactionClient,
    userId: string,
  ): Promise<Map<string, Date>> {
    const rows = await client.userAchievement.findMany({
      where: { userId },
      select: { unlockedAt: true, achievement: { select: { code: true } } },
    });
    return new Map(rows.map((r) => [r.achievement.code, r.unlockedAt]));
  }

  /**
   * Credita o que a sessao rendeu: XP, nivel e conquistas novas.
   *
   * Roda DENTRO da transacao do finish e so e chamado por quem de fato fechou a
   * sessao (o sessions.service checa `finishedAt === null` antes). E o que
   * impede um retry do finish de pagar o mesmo treino duas vezes.
   */
  /** Tudo que a apuracao precisa, numa ida so ao banco. */
  private async carregaParaApuracao(
    tx: Prisma.TransactionClient,
    userId: string,
    sessionId: string,
    tz: string,
  ) {
    const [{ stats, prsNestaSessao, streak }, setCount, perfil, jaTem] =
      await Promise.all([
        this.loadStats(tx, userId, tz, sessionId),
        tx.setLog.count({ where: { sessionId, completed: true } }),
        // Upsert com update vazio: cria o perfil na primeira vez e, nas
        // seguintes, so devolve o que ja existe.
        tx.gameProfile.upsert({
          where: { userId },
          create: { userId },
          update: {},
        }),
        this.unlockedAt(tx, userId),
      ]);

    return { stats, prsNestaSessao, streak, setCount, perfil, jaTem };
  }

  async applyForSession(
    tx: Prisma.TransactionClient,
    userId: string,
    sessionId: string,
    tz: string,
  ): Promise<SessionReward> {
    const { stats, prsNestaSessao, streak, setCount, perfil, jaTem } =
      await this.carregaParaApuracao(tx, userId, sessionId, tz);

    const xpDaSessao = computeSessionXp({
      setCount,
      prCount: prsNestaSessao,
      streak,
    });

    const novas = evaluateUnlocks(stats, [...jaTem.keys()]);
    const xpDasConquistas = novas.reduce((soma, a) => soma + a.xpReward, 0);
    const xpGained = xpDaSessao + xpDasConquistas;

    // O nivel sai do XP, nao da coluna `level` — que e cache de leitura e
    // poderia divergir. Derivar aqui garante que `leveledUp` reflita a mesma
    // verdade que o GET /game devolve.
    const levelBefore = levelFor(perfil.xp);
    const xpDepois = perfil.xp + xpGained;
    const levelAfter = levelFor(xpDepois);

    await tx.gameProfile.update({
      where: { userId },
      data: { xp: xpDepois, level: levelAfter },
    });

    const gravadasEm = await this.gravaConquistas(tx, userId, novas);

    return {
      xpGained,
      xpFromAchievements: xpDasConquistas,
      streakBonus: streakBonusFor(streak),
      levelBefore,
      levelAfter,
      leveledUp: levelAfter > levelBefore,
      unlocked: novas.map((def) =>
        toAchievement(def, stats, gravadasEm.get(def.code) ?? null),
      ),
    };
  }

  /** Grava as conquistas novas e devolve a data de cada uma. */
  private async gravaConquistas(
    tx: Prisma.TransactionClient,
    userId: string,
    novas: readonly AchievementDef[],
  ): Promise<Map<string, Date>> {
    if (novas.length === 0) return new Map();

    const linhas = await tx.achievement.findMany({
      where: { code: { in: novas.map((a) => a.code) } },
      select: { id: true, code: true },
    });

    // skipDuplicates + o unique [userId, achievementId]: dois finish simultaneos
    // que avaliem a mesma conquista nao conseguem grava-la duas vezes.
    await tx.userAchievement.createMany({
      data: linhas.map((l) => ({ userId, achievementId: l.id })),
      skipDuplicates: true,
    });

    const gravadas = await tx.userAchievement.findMany({
      where: { userId, achievementId: { in: linhas.map((l) => l.id) } },
      select: { unlockedAt: true, achievement: { select: { code: true } } },
    });
    return new Map(gravadas.map((g) => [g.achievement.code, g.unlockedAt]));
  }

  /** XP e nivel do usuario (GET /game). */
  async get(userId: string): Promise<Game> {
    const perfil = await this.prisma.gameProfile.findUnique({
      where: { userId },
    });

    // Sem perfil ainda (nunca fechou um treino) = zerado. Nao criamos a linha
    // numa leitura: GET nao escreve.
    const xp = perfil?.xp ?? 0;
    const level = levelFor(xp);
    const piso = xpForLevel(level);

    return {
      xp,
      level,
      xpIntoLevel: xp - piso,
      xpForNextLevel: xpForLevel(level + 1) - piso,
    };
  }

  /** O catalogo inteiro com o progresso do usuario (GET /game/achievements). */
  async achievements(userId: string, tz: string): Promise<Achievement[]> {
    const [{ stats }, jaTem] = await Promise.all([
      // sessionId vazio: aqui nao existe "sessao atual". Nenhum cuid() e string
      // vazia, entao o FILTER da query de PR simplesmente nao casa com nada — e
      // `prsNestaSessao`, que sairia zero, nao e usado nesta leitura.
      this.loadStats(this.prisma, userId, tz, ""),
      this.unlockedAt(this.prisma, userId),
    ]);

    return ACHIEVEMENTS.map((def) =>
      toAchievement(def, stats, jaTem.get(def.code) ?? null),
    );
  }
}

function toAchievement(
  def: AchievementDef,
  stats: UnlockStats,
  unlockedAt: Date | null,
): Achievement {
  return {
    code: def.code,
    name: def.name,
    description: def.description,
    icon: def.icon,
    xpReward: def.xpReward,
    target: def.target,
    progress: progressFor(def, stats),
    unlockedAt: unlockedAt?.toISOString() ?? null,
  };
}
