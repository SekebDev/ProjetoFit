import { z } from "zod";

/**
 * Limites de sanidade do peso corporal — os mesmos do perfil (profile.ts), de
 * proposito: e a mesma grandeza, e dois ranges diferentes pra "quanto voce pesa"
 * so criariam a chance de o perfil aceitar um valor que a metrica recusa.
 */
export const MIN_BODY_WEIGHT_KG = 20;
export const MAX_BODY_WEIGHT_KG = 400;
/** Percentual de gordura: 3% e o piso fisiologico, 70% e absurdo com folga. */
export const MIN_BODY_FAT = 3;
export const MAX_BODY_FAT = 70;

// ---------- entrada ----------

/**
 * POST /metrics — a data e do servidor, o resto e do usuario.
 *
 * Tudo nullable e nao opcional, como no resto do app: pesar sem medir gordura e
 * o caso comum. O refine existe porque um registro com os tres campos nulos
 * seria uma linha vazia no historico e um ponto fantasma no grafico.
 */
export const CreateMetricSchema = z
  .object({
    weightKg: z
      .number()
      .min(MIN_BODY_WEIGHT_KG)
      .max(MAX_BODY_WEIGHT_KG)
      .nullable(),
    bodyFat: z.number().min(MIN_BODY_FAT).max(MAX_BODY_FAT).nullable(),
    notes: z.string().max(1000).nullable(),
  })
  .refine(
    (m) => m.weightKg !== null || m.bodyFat !== null || m.notes !== null,
    "Informe ao menos um valor",
  );
export type CreateMetricInput = z.infer<typeof CreateMetricSchema>;

// ---------- saida ----------

export const BodyMetricSchema = z.object({
  id: z.string(),
  date: z.string(),
  weightKg: z.number().nullable(),
  bodyFat: z.number().nullable(),
  notes: z.string().nullable(),
});
export type BodyMetric = z.infer<typeof BodyMetricSchema>;
