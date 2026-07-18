import { z } from "zod";
import { ExerciseSchema } from "./exercise";
import { SessionRewardSchema } from "./game";
import { MAX_SETS, PlanDaySchema } from "./plan";
import { TimeZoneSchema } from "./progress";

/** Limites de sanidade — evitam payloads absurdos e travam a UI num range util. */
export const MAX_WEIGHT_KG = 500;
export const MAX_REPS = 100;
/** Escala RPE padrao de treino: 5 a 10, em passos de 0,5. */
export const MIN_RPE = 5;
export const MAX_RPE = 10;

// ---------- entrada ----------

/** Reusado no body do POST /sessions e na query do GET /sessions/last-loads. */
export const PlanDayIdSchema = z.string().min(1);

/** POST /sessions — o resto (userId, date) vem do JWT e do servidor. */
export const StartSessionSchema = z.object({
  planDayId: PlanDayIdSchema,
});
export type StartSessionInput = z.infer<typeof StartSessionSchema>;

// weightKg/reps/rpe sao nullable, nao opcionais: registrar uma serie sem carga
// (peso corporal) ou sem RPE e normal, mas o campo tem que vir explicito.
export const LogSetSchema = z.object({
  exerciseId: z.string().min(1),
  setNumber: z.number().int().min(1).max(MAX_SETS),
  weightKg: z.number().min(0).max(MAX_WEIGHT_KG).nullable(),
  reps: z.number().int().min(0).max(MAX_REPS).nullable(),
  rpe: z
    .number()
    .min(MIN_RPE)
    .max(MAX_RPE)
    .refine((v) => Number.isInteger(v * 2), "O RPE vai de 0,5 em 0,5")
    .nullable(),
  completed: z.boolean(),
});
export type LogSetInput = z.infer<typeof LogSetSchema>;

/** PATCH /sessions/:id/finish — a duracao o servidor calcula, nao o cliente. */
export const FinishSessionSchema = z.object({
  notes: z.string().max(1000).nullable(),
  /**
   * Fuso do cliente. Fechar o treino concede XP, e o multiplicador vem da
   * sequencia — que so faz sentido no fuso de quem treinou. Serve tambem pra
   * saber se o treino comecou de madrugada (conquista do madrugador).
   */
  tz: TimeZoneSchema,
});
export type FinishSessionInput = z.infer<typeof FinishSessionSchema>;

// ---------- saida ----------

export const SetLogSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  setNumber: z.number().int(),
  weightKg: z.number().nullable(),
  reps: z.number().int().nullable(),
  rpe: z.number().nullable(),
  completed: z.boolean(),
  createdAt: z.string(),
});
export type SetLog = z.infer<typeof SetLogSchema>;

export const SessionSchema = z.object({
  id: z.string(),
  // null depois que o plano e editado: editar apaga e recria os PlanDay, e a FK
  // e SetNull pra nao travar a edicao de quem ja treinou.
  planDayId: z.string().nullable(),
  // O dia inteiro, com a prescricao (series, reps, descanso) e os exercicios:
  // e o que a tela de treino renderiza. Sem isto ela nao teria o que mostrar.
  planDay: PlanDaySchema.nullable(),
  date: z.string(),
  /** null = sessao em aberto. */
  finishedAt: z.string().nullable(),
  durationSec: z.number().int().nullable(),
  notes: z.string().nullable(),
  setLogs: z.array(SetLogSchema),
});
export type Session = z.infer<typeof SessionSchema>;

/**
 * Resposta do PATCH /sessions/:id/finish.
 *
 * A recompensa vem separada da sessao de proposito: `Session` e o mesmo objeto
 * devolvido pelo start e pelo /active, onde recompensa nao faz sentido. Aqui o
 * `reward` e null quando o finish nao concedeu nada — retry de uma sessao que
 * ja estava fechada.
 */
export const FinishSessionResultSchema = z.object({
  session: SessionSchema,
  reward: SessionRewardSchema.nullable(),
});
export type FinishSessionResult = z.infer<typeof FinishSessionResultSchema>;

/** Item do GET /sessions — sem os logs, so o resumo pro historico. */
export const SessionSummarySchema = z.object({
  id: z.string(),
  planDayId: z.string().nullable(),
  planDayName: z.string().nullable(),
  date: z.string(),
  finishedAt: z.string().nullable(),
  durationSec: z.number().int().nullable(),
  setCount: z.number().int(),
});
export type SessionSummary = z.infer<typeof SessionSummarySchema>;

/**
 * Ultima serie registrada de um exercicio (GET /sessions/last-loads).
 * A UI usa isso pra pre-preencher a carga — "bater o registro anterior" vira
 * so olhar o campo ja preenchido.
 */
export const LastLoadSchema = z.object({
  exercise: ExerciseSchema.pick({ id: true, name: true }),
  /** A carga MAIS RECENTE — o que pre-preenche o campo. */
  weightKg: z.number().nullable(),
  reps: z.number().int().nullable(),
  date: z.string(),
  /**
   * O RECORDE historico do exercicio: a melhor serie de todos os tempos, por
   * carga e, no empate, por repeticoes.
   *
   * Vem separado da carga recente porque as duas respondem perguntas
   * diferentes: a recente pre-preenche o campo, o recorde decide se a serie que
   * acabou de entrar e PR. Sem isto o cliente comparava com a ultima serie e
   * comemorava PR onde o servidor (que compara com o recorde) nao pagava XP.
   *
   * null quando o exercicio nunca teve serie com carga (so peso corporal).
   */
  bestWeightKg: z.number().nullable(),
  bestReps: z.number().int().nullable(),
});
export type LastLoad = z.infer<typeof LastLoadSchema>;
