import { z } from "zod";
import { ExerciseSchema } from "./exercise";

export const PLAN_SOURCES = ["MANUAL", "AI"] as const;

/** Limites de sanidade — evitam payloads absurdos e travam a UI num range util. */
export const MAX_DAYS_PER_PLAN = 7;
export const MAX_EXERCISES_PER_DAY = 20;
export const MAX_SETS = 20;
export const MAX_REST_SEC = 600;

/** "8" ou "8-12". */
const REP_SCHEME_RE = /^\d{1,2}(-\d{1,2})?$/;

// ---------- entrada (POST/PUT /plans) ----------

export const PlanExerciseInputSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().min(1).max(MAX_SETS),
  repScheme: z
    .string()
    .regex(REP_SCHEME_RE, 'Use "8" ou um intervalo como "8-12"'),
  restSec: z.number().int().min(0).max(MAX_REST_SEC),
  notes: z.string().max(500).nullable(),
});
export type PlanExerciseInput = z.infer<typeof PlanExerciseInputSchema>;

export const PlanDayInputSchema = z.object({
  name: z.string().min(1).max(60),
  focus: z.string().max(60).nullable(),
  exercises: z.array(PlanExerciseInputSchema).min(1).max(MAX_EXERCISES_PER_DAY),
});
export type PlanDayInput = z.infer<typeof PlanDayInputSchema>;

// `order` nao entra no input de proposito: e derivado do indice do array no
// servidor. Confiar no cliente aqui abriria espaco pra ordens duplicadas.
export const CreatePlanSchema = z.object({
  name: z.string().min(1).max(80),
  notes: z.string().max(1000).nullable(),
  days: z.array(PlanDayInputSchema).min(1).max(MAX_DAYS_PER_PLAN),
});
export type CreatePlanInput = z.infer<typeof CreatePlanSchema>;

/** PUT /plans/:id substitui o plano inteiro (dias e exercicios inclusos). */
export const UpdatePlanSchema = CreatePlanSchema;
export type UpdatePlanInput = z.infer<typeof UpdatePlanSchema>;

// ---------- saida ----------

export const PlanExerciseSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  sets: z.number().int(),
  repScheme: z.string(),
  restSec: z.number().int(),
  notes: z.string().nullable(),
  exercise: ExerciseSchema,
});
export type PlanExercise = z.infer<typeof PlanExerciseSchema>;

export const PlanDaySchema = z.object({
  id: z.string(),
  name: z.string(),
  focus: z.string().nullable(),
  order: z.number().int(),
  exercises: z.array(PlanExerciseSchema),
});
export type PlanDay = z.infer<typeof PlanDaySchema>;

export const PlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.enum(PLAN_SOURCES),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  days: z.array(PlanDaySchema),
});
export type Plan = z.infer<typeof PlanSchema>;

/** Item da lista GET /plans — sem os dias, so o resumo. */
export const PlanSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.enum(PLAN_SOURCES),
  isActive: z.boolean(),
  createdAt: z.string(),
  dayCount: z.number().int(),
});
export type PlanSummary = z.infer<typeof PlanSummarySchema>;
