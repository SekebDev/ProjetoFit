import { z } from "zod";
import { ExerciseSchema } from "./exercise";

/** Janela do grafico de volume semanal. 12 semanas ~ um trimestre de treino. */
export const SUMMARY_WEEKS = 12;

/**
 * Aceita so nomes IANA que o proprio runtime reconhece ("America/Sao_Paulo").
 *
 * Isto nao e paranoia com string: o fuso vai parar num `AT TIME ZONE` no
 * Postgres. O Prisma parametriza o valor (entao nao ha injecao), mas um nome
 * invalido viraria erro do banco — 500 — em vez de 400. Validar aqui devolve a
 * culpa pra quem mandou a query errada.
 */
function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fuso do cliente, usado pra fatiar as semanas.
 *
 * Sem isto o `date_trunc` usa o fuso do servidor: um treino de domingo 22h em
 * Sao Paulo vira segunda 01h UTC e cai na semana seguinte — o usuario ve o
 * treino de domingo contado na semana errada.
 */
export const TimeZoneSchema = z
  .string()
  .min(1)
  .max(64)
  .refine(isValidTimeZone, "Fuso horário inválido");

// ---------- saida ----------

/**
 * Um ponto do grafico de um exercicio: o que aquele exercicio rendeu numa
 * sessao. Uma sessao vira um ponto, nao uma serie — senao o grafico viraria
 * serrilha em vez de progressao.
 */
export const ExercisePointSchema = z.object({
  sessionId: z.string(),
  date: z.string(),
  /** null quando nenhuma serie teve carga (peso corporal). */
  maxWeightKg: z.number().nullable(),
  /** Σ reps×carga da sessao. null quando nenhuma serie teve carga. */
  volume: z.number().nullable(),
  totalReps: z.number().int(),
  setCount: z.number().int(),
});
export type ExercisePoint = z.infer<typeof ExercisePointSchema>;

export const ExerciseProgressSchema = z.object({
  exercise: ExerciseSchema.pick({ id: true, name: true }),
  points: z.array(ExercisePointSchema),
});
export type ExerciseProgress = z.infer<typeof ExerciseProgressSchema>;

/** Uma barra do grafico de volume semanal. */
export const WeeklyVolumeSchema = z.object({
  /** Segunda-feira da semana, no fuso do cliente (ISO). */
  weekStart: z.string(),
  volume: z.number(),
  sessionCount: z.number().int(),
});
export type WeeklyVolume = z.infer<typeof WeeklyVolumeSchema>;

/**
 * Os dois PRs de um exercicio: carga maxima e volume maximo.
 *
 * Ambos nullable porque exercicio so de peso corporal nao tem carga nem
 * volume — nesse caso o exercicio nem entra na lista.
 */
export const PersonalRecordSchema = z.object({
  exercise: ExerciseSchema.pick({ id: true, name: true }),
  maxWeightKg: z.number().nullable(),
  maxWeightDate: z.string().nullable(),
  /** Maior Σ reps×carga do exercicio num unico treino. */
  maxVolume: z.number().nullable(),
  maxVolumeDate: z.string().nullable(),
});
export type PersonalRecord = z.infer<typeof PersonalRecordSchema>;

export const ProgressSummarySchema = z.object({
  weeklyVolume: z.array(WeeklyVolumeSchema),
  records: z.array(PersonalRecordSchema),
  totalSessions: z.number().int(),
});
export type ProgressSummary = z.infer<typeof ProgressSummarySchema>;

/**
 * Estado da sequencia, que dita a pose e a fala da Rackie no painel:
 * - `unscheduled`: sem plano ativo com dias agendados — nao da pra contar.
 * - `idle`: sequencia zerada — bora comecar.
 * - `active`: treinou o dia agendado, sequencia viva.
 * - `resting`: dia de folga com a sequencia salva (descanso merecido).
 * - `atRisk`: tem sequencia, mas o dia agendado de hoje ainda nao foi cumprido.
 */
export const StreakStateSchema = z.enum([
  "unscheduled",
  "idle",
  "active",
  "resting",
  "atRisk",
]);
export type StreakState = z.infer<typeof StreakStateSchema>;

/**
 * Sequencia (GET /progress/streak).
 *
 * Conta dias de treino AGENDADOS cumpridos, com reposicao: faltar num dia
 * agendado nao quebra se voce treinar num dia de folga antes do proximo dia
 * agendado. Derivada do historico de sessoes — sem estado persistido.
 */
export const StreakSchema = z.object({
  /** Dias agendados cumpridos em sequencia agora. */
  current: z.number().int(),
  /** Maior sequencia ja atingida na janela analisada. */
  best: z.number().int(),
  state: StreakStateSchema,
  /** Hoje e um dia agendado de treino? */
  scheduledToday: z.boolean(),
  /** Ja treinou hoje? */
  trainedToday: z.boolean(),
});
export type Streak = z.infer<typeof StreakSchema>;

/**
 * Sugestao de deload (GET /progress/deload).
 *
 * Combina dois gatilhos: FATIGUE = o volume da ultima semana completa caiu
 * abaixo do limiar vs. a media recente; CYCLE = muitas semanas "pesadas"
 * seguidas (periodizacao). BOTH = os dois ao mesmo tempo.
 */
export const DeloadSchema = z.object({
  recommend: z.boolean(),
  reason: z.enum(["FATIGUE", "CYCLE", "BOTH"]).nullable(),
  /** Volume da ultima semana COMPLETA (a semana corrente em andamento nao conta). */
  lastWeekVolume: z.number().nullable(),
  /** Media das ultimas semanas treinadas, base da comparacao. */
  baselineVolume: z.number().nullable(),
  /** Quanto a ultima semana caiu vs. a base (0..1); null quando nao da pra medir. */
  dropPct: z.number().nullable(),
  /** Semanas "pesadas" consecutivas terminando na ultima. */
  hardWeekStreak: z.number().int(),
});
export type Deload = z.infer<typeof DeloadSchema>;
