import { Injectable, NotFoundException } from "@nestjs/common";
import {
  SUMMARY_WEEKS,
  type Deload,
  type ExercisePoint,
  type ExerciseProgress,
  type PersonalRecord,
  type ProgressSummary,
  type Streak,
  type WeeklyVolume,
} from "@workout/shared";
import { PrismaService } from "../prisma/prisma.service";
import { computeDeload } from "./deload";
import { computeStreak } from "./streak";

/** Teto de pontos no grafico de um exercicio. */
const MAX_POINTS = 200;
/**
 * Teto de recordes no resumo.
 *
 * Na pratica quem limita isto e o usuario — ninguem treina 100 exercicios
 * diferentes. Mas a biblioteca semeada tem ~800, e uma query sem teto e uma
 * query sem teto: o limite existe pelo mesmo motivo que o MAX_POINTS.
 */
const MAX_RECORDS = 100;

interface PointRow {
  sessionId: string;
  date: Date;
  maxWeightKg: number | null;
  volume: number | null;
  totalReps: number;
  setCount: number;
}

interface WeekRow {
  weekStart: Date;
  volume: number;
  sessionCount: number;
}

interface RecordRow {
  id: string;
  name: string;
  maxWeightKg: number | null;
  maxWeightDate: Date | null;
  maxVolume: number | null;
  maxVolumeDate: Date | null;
}

function toPoint(row: PointRow): ExercisePoint {
  return {
    sessionId: row.sessionId,
    date: row.date.toISOString(),
    maxWeightKg: row.maxWeightKg,
    volume: row.volume,
    totalReps: row.totalReps,
    setCount: row.setCount,
  };
}

function toRecord(row: RecordRow): PersonalRecord {
  return {
    exercise: { id: row.id, name: row.name },
    maxWeightKg: row.maxWeightKg,
    maxWeightDate: row.maxWeightDate?.toISOString() ?? null,
    maxVolume: row.maxVolume,
    maxVolumeDate: row.maxVolumeDate?.toISOString() ?? null,
  };
}

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Serie historica de um exercicio: uma sessao encerrada = um ponto.
   *
   * Agrupar por sessao (e nao por serie) e o que transforma serrilha em
   * progressao — o grafico responde "estou subindo carga?", nao "quantos kg
   * fiz na terceira serie de 12 de marco?".
   */
  async byExercise(
    userId: string,
    exerciseId: string,
  ): Promise<ExerciseProgress> {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true, name: true },
    });
    if (!exercise) {
      throw new NotFoundException("Exercício não encontrado");
    }

    // Os casts nao sao decoracao: sem eles o COUNT e o SUM(int) do Postgres
    // chegam como BigInt, e o JSON.stringify do Nest lanca em BigInt.
    // Convertendo no banco, o driver ja entrega number.
    //
    // Sem COALESCE no volume, de proposito: sessao so de peso corporal tem
    // SUM(reps*carga) = NULL, e NULL e a resposta honesta ("nao houve carga"),
    // nao 0 — que seria indistinguivel de "levantou nada".
    const rows = await this.prisma.$queryRaw<PointRow[]>`
      SELECT
        s.id                                 AS "sessionId",
        s.date                               AS "date",
        MAX(l."weightKg")::float8            AS "maxWeightKg",
        SUM(l.reps * l."weightKg")::float8   AS "volume",
        COALESCE(SUM(l.reps), 0)::int        AS "totalReps",
        COUNT(*)::int                        AS "setCount"
      FROM "SetLog" l
      JOIN "WorkoutSession" s ON s.id = l."sessionId"
      WHERE l."exerciseId" = ${exerciseId}
        AND l.completed = true
        AND s."userId" = ${userId}
        AND s."finishedAt" IS NOT NULL
      GROUP BY s.id, s.date
      ORDER BY s.date DESC
      LIMIT ${MAX_POINTS}
    `;

    // DESC no banco + reverse aqui: o LIMIT precisa cortar as sessoes ANTIGAS,
    // mas o grafico le da esquerda pra direita.
    return { exercise, points: rows.reverse().map(toPoint) };
  }

  async summary(userId: string, tz: string): Promise<ProgressSummary> {
    const [weeklyVolume, records, totalSessions] = await Promise.all([
      this.weeklyVolume(userId, tz),
      this.records(userId),
      this.prisma.workoutSession.count({
        where: { userId, finishedAt: { not: null } },
      }),
    ]);
    return { weeklyVolume, records, totalSessions };
  }

  /**
   * Sugestao de deload a partir do volume semanal.
   *
   * Reusa o weeklyVolume (ja fatiado no fuso do usuario) e busca o inicio da
   * semana corrente no MESMO fuso, pra computeDeload descartar a semana em
   * andamento — comparar semana parcial com semanas inteiras sempre acusaria
   * "queda".
   */
  async deload(userId: string, tz: string): Promise<Deload> {
    const [weeks, [{ weekStart }]] = await Promise.all([
      this.weeklyVolume(userId, tz),
      this.prisma.$queryRaw<{ weekStart: Date }[]>`
        SELECT (date_trunc('week', now() AT TIME ZONE ${tz}) AT TIME ZONE ${tz})
               AS "weekStart"
      `,
    ]);
    return computeDeload(weeks, weekStart.toISOString());
  }

  /**
   * Sequencia de dias de treino agendados cumpridos (com reposicao).
   *
   * Deriva de tres fontes, sem estado persistido: os dias em que houve treino
   * encerrado (no fuso do usuario), os dias da semana agendados do plano ativo,
   * e "hoje". O calculo em si mora em computeStreak — aqui so montamos os dados.
   *
   * O `(date AT TIME ZONE 'UTC') AT TIME ZONE ${tz}` e o mesmo padrao de dois
   * passos do weeklyVolume: a coluna e timestamp UTC sem fuso, entao afirmamos
   * "isto e UTC" e so depois convertemos pro horario do usuario — senao um
   * treino de domingo a noite cairia no dia errado.
   */
  async streak(userId: string, tz: string): Promise<Streak> {
    const [trainedRows, [{ today }], plan] = await Promise.all([
      this.prisma.$queryRaw<{ day: string }[]>`
        SELECT DISTINCT to_char(
          date_trunc('day', (s.date AT TIME ZONE 'UTC') AT TIME ZONE ${tz}),
          'YYYY-MM-DD'
        ) AS "day"
        FROM "WorkoutSession" s
        WHERE s."userId" = ${userId}
          AND s."finishedAt" IS NOT NULL
          AND s.date >= now() - make_interval(days => 400)
      `,
      this.prisma.$queryRaw<{ today: string }[]>`
        SELECT to_char(date_trunc('day', now() AT TIME ZONE ${tz}), 'YYYY-MM-DD')
               AS "today"
      `,
      this.prisma.workoutPlan.findFirst({
        where: { userId, isActive: true },
        select: { days: { select: { weekday: true } } },
      }),
    ]);

    const scheduleWeekdays = plan
      ? [
          ...new Set(
            plan.days
              .map((d) => d.weekday)
              .filter((w): w is number => w !== null),
          ),
        ]
      : [];

    return computeStreak({
      today,
      trainedDates: trainedRows.map((r) => r.day),
      scheduleWeekdays,
    });
  }

  /**
   * Volume por semana, nas ultimas SUMMARY_WEEKS semanas.
   *
   * O `(date AT TIME ZONE 'UTC') AT TIME ZONE ${tz}` sao dois passos porque a
   * coluna e `timestamp without time zone`: o Prisma grava UTC, mas o Postgres
   * nao sabe disso. O primeiro AT TIME ZONE afirma "isto e UTC" (vira
   * timestamptz), o segundo converte pro horario do usuario. Um AT TIME ZONE
   * sozinho faria o contrario — interpretaria o valor como se ja fosse local.
   *
   * Sem isso, um treino de domingo 23h em Sao Paulo (= segunda 02h UTC) seria
   * contado na semana seguinte.
   */
  private async weeklyVolume(
    userId: string,
    tz: string,
  ): Promise<WeeklyVolume[]> {
    // LEFT JOIN, nao JOIN: sessao encerrada sem nenhuma serie registrada ainda
    // conta como treino feito. Com JOIN ela sumiria da contagem.
    //
    // Aqui o COALESCE(...,0) e deliberado, ao contrario do byExercise: o schema
    // declara volume como number nao-nullable porque, numa barra semanal, "so
    // fiz peso corporal" e zero de carga levantada — e a barra vazia diz isso.
    //
    // O `::int` no make_interval nao e opcional: o Prisma manda number como
    // bigint e so existe make_interval(weeks => int) — sem o cast, 42883.
    const rows = await this.prisma.$queryRaw<WeekRow[]>`
      SELECT
        (date_trunc('week', (s.date AT TIME ZONE 'UTC') AT TIME ZONE ${tz})
          AT TIME ZONE ${tz})                             AS "weekStart",
        COALESCE(SUM(l.reps * l."weightKg"), 0)::float8   AS "volume",
        COUNT(DISTINCT s.id)::int                         AS "sessionCount"
      FROM "WorkoutSession" s
      LEFT JOIN "SetLog" l ON l."sessionId" = s.id AND l.completed = true
      WHERE s."userId" = ${userId}
        AND s."finishedAt" IS NOT NULL
        AND (s.date AT TIME ZONE 'UTC') AT TIME ZONE ${tz}
            >= date_trunc('week', now() AT TIME ZONE ${tz})
               - make_interval(weeks => ${SUMMARY_WEEKS - 1}::int)
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    return rows.map((r) => ({
      weekStart: r.weekStart.toISOString(),
      volume: r.volume,
      sessionCount: r.sessionCount,
    }));
  }

  /**
   * Os dois PRs de cada exercicio: maior carga e maior volume num unico treino.
   *
   * Sao duas agregacoes diferentes e nao da pra fundir numa: carga e o maximo
   * de UMA serie, volume e o maximo da SOMA de um treino. O DISTINCT ON com
   * `date ASC` no desempate faz o PR apontar pra PRIMEIRA vez que o recorde foi
   * atingido — que e o que "recorde" significa. Repetir a mesma carga depois
   * nao rouba a data do feito original.
   */
  private async records(userId: string): Promise<PersonalRecord[]> {
    const rows = await this.prisma.$queryRaw<RecordRow[]>`
      WITH logs AS (
        SELECT l."exerciseId", l."weightKg", l.reps, s.id AS "sessionId", s.date
        FROM "SetLog" l
        JOIN "WorkoutSession" s ON s.id = l."sessionId"
        WHERE s."userId" = ${userId}
          AND s."finishedAt" IS NOT NULL
          AND l.completed = true
      ),
      weight_pr AS (
        SELECT DISTINCT ON ("exerciseId") "exerciseId", "weightKg", date
        FROM logs
        WHERE "weightKg" IS NOT NULL
        ORDER BY "exerciseId", "weightKg" DESC, date ASC
      ),
      session_vol AS (
        SELECT "exerciseId", "sessionId", date, SUM(reps * "weightKg") AS vol
        FROM logs
        GROUP BY "exerciseId", "sessionId", date
      ),
      volume_pr AS (
        SELECT DISTINCT ON ("exerciseId") "exerciseId", vol, date
        FROM session_vol
        WHERE vol IS NOT NULL
        ORDER BY "exerciseId", vol DESC, date ASC
      )
      SELECT
        e.id                  AS "id",
        e.name                AS "name",
        w."weightKg"::float8  AS "maxWeightKg",
        w.date                AS "maxWeightDate",
        v.vol::float8         AS "maxVolume",
        v.date                AS "maxVolumeDate"
      FROM "Exercise" e
      -- JOIN (nao LEFT) no weight_pr: exercicio so de peso corporal nao tem
      -- carga nem volume, entao nao tem recorde a mostrar. Fica de fora.
      JOIN weight_pr w ON w."exerciseId" = e.id
      LEFT JOIN volume_pr v ON v."exerciseId" = e.id
      ORDER BY e.name ASC
      LIMIT ${MAX_RECORDS}
    `;
    return rows.map(toRecord);
  }
}
