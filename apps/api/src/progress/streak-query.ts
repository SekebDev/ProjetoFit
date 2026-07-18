import type { Prisma } from "@prisma/client";
import type { Streak } from "@workout/shared";
import { computeStreak } from "./streak";

/**
 * Busca o que `computeStreak` precisa e devolve a sequencia.
 *
 * Recebe o client em vez de usar o PrismaService injetado porque o GameService
 * precisa chamar isto DENTRO da transacao do finish: fora dela, a sessao que
 * acabou de fechar ainda nao commitou, e a sequencia voltaria sem o treino de
 * hoje — o multiplicador de XP sairia um dia atrasado.
 */
export async function loadStreak(
  client: Prisma.TransactionClient,
  userId: string,
  tz: string,
): Promise<Streak> {
  const [trainedRows, [{ today }], plan] = await Promise.all([
    client.$queryRaw<{ day: string }[]>`
      SELECT DISTINCT to_char(
        date_trunc('day', (s.date AT TIME ZONE 'UTC') AT TIME ZONE ${tz}),
        'YYYY-MM-DD'
      ) AS "day"
      FROM "WorkoutSession" s
      WHERE s."userId" = ${userId}
        AND s."finishedAt" IS NOT NULL
        AND s.date >= now() - make_interval(days => 400)
    `,
    client.$queryRaw<{ today: string }[]>`
      SELECT to_char(date_trunc('day', now() AT TIME ZONE ${tz}), 'YYYY-MM-DD')
             AS "today"
    `,
    client.workoutPlan.findFirst({
      where: { userId, isActive: true },
      select: { days: { select: { weekday: true } } },
    }),
  ]);

  const scheduleWeekdays = plan
    ? [
        ...new Set(
          plan.days.map((d) => d.weekday).filter((w): w is number => w !== null),
        ),
      ]
    : [];

  return computeStreak({
    today,
    trainedDates: trainedRows.map((r) => r.day),
    scheduleWeekdays,
  });
}
