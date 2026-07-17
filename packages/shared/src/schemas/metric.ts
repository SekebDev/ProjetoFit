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

/**
 * Limites da composicao corporal (a secao avancada do perfil).
 *
 * Sao limites de sanidade, nao de julgamento: existem pra barrar dedo escorregado
 * (um "800" no lugar de "80"), nao pra dizer quem cabe no app.
 */
export const COMPOSITION_RANGES = {
  leanMassKg: { min: 10, max: 200 },
  waistCm: { min: 40, max: 200 },
  armCm: { min: 15, max: 80 },
  chestCm: { min: 50, max: 200 },
  thighCm: { min: 25, max: 120 },
} as const;

/** Campo de composicao: sempre nullable, sempre com teto. */
function medida(faixa: { min: number; max: number }) {
  return z.number().min(faixa.min).max(faixa.max).nullable();
}

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
    leanMassKg: medida(COMPOSITION_RANGES.leanMassKg),
    waistCm: medida(COMPOSITION_RANGES.waistCm),
    armCm: medida(COMPOSITION_RANGES.armCm),
    chestCm: medida(COMPOSITION_RANGES.chestCm),
    thighCm: medida(COMPOSITION_RANGES.thighCm),
    notes: z.string().max(1000).nullable(),
  })
  // Object.values e nao uma lista de campos escrita a mao: com a lista, incluir
  // uma medida nova e esquecer de adiciona-la aqui faria o registro "so cintura"
  // ser recusado como vazio — um bug silencioso a cada campo novo.
  .refine(
    (m) => Object.values(m).some((v) => v !== null),
    "Informe ao menos um valor",
  );
export type CreateMetricInput = z.infer<typeof CreateMetricSchema>;

// ---------- saida ----------

export const BodyMetricSchema = z.object({
  id: z.string(),
  date: z.string(),
  weightKg: z.number().nullable(),
  bodyFat: z.number().nullable(),
  leanMassKg: z.number().nullable(),
  waistCm: z.number().nullable(),
  armCm: z.number().nullable(),
  chestCm: z.number().nullable(),
  thighCm: z.number().nullable(),
  notes: z.string().nullable(),
});
export type BodyMetric = z.infer<typeof BodyMetricSchema>;

/** As medidas que a secao avancada mostra, na ordem em que aparecem na tela. */
export const COMPOSITION_FIELDS = [
  { key: "bodyFat", label: "Gordura", unidade: "%" },
  { key: "leanMassKg", label: "Massa magra", unidade: "kg" },
  { key: "waistCm", label: "Cintura", unidade: "cm" },
  { key: "armCm", label: "Braço", unidade: "cm" },
  { key: "chestCm", label: "Peito", unidade: "cm" },
  { key: "thighCm", label: "Coxa", unidade: "cm" },
] as const satisfies readonly {
  key: keyof CreateMetricInput;
  label: string;
  unidade: string;
}[];
