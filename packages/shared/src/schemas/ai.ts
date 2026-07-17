import { z } from "zod";
import type { CreatePlanInput } from "./plan";

// ---------- saida da IA ----------

/**
 * O formato que a OpenAI e OBRIGADA a devolver (structured outputs).
 *
 * Regra que nao da pra esquecer: em structured outputs todo campo e required.
 * Por isso `notes` e `.nullable()` e nunca `.optional()` — `.optional()` gera um
 * JSON Schema sem o campo em `required`, e a API recusa o schema inteiro.
 *
 * Sem `.min()`/`.max()` nos numeros e sem regex no repScheme de proposito: o
 * zodTextFormat traduz isto pra JSON Schema, e structured outputs nao suporta
 * restricao de valor — so de forma. Quem confere valor e o CreatePlanSchema,
 * depois (ver aiPlanToCreateInput).
 */
export const AiExerciseSchema = z.object({
  /**
   * O SLUG do exercicio (ex. "Bench_Press"), nao o id.
   *
   * Os ids do banco sao cuids opacos de 25 chars ("cmrl580f70000gtzo4l6fm5up"),
   * e nenhum LLM copia isso de forma confiavel de uma lista de centenas — ele
   * inventa ou erra, e o plano inteiro cai na validacao. O slug e legivel e
   * semantico: a IA sabe o que e um "Bench_Press", entao escolhe certo E copia
   * certo. O servidor resolve slug -> id (aiPlanToCreateInput).
   */
  slug: z.string(),
  sets: z.number().int(),
  /** "8" ou "8-12". O prompt explica; o CreatePlanSchema e quem cobra. */
  repScheme: z.string(),
  restSec: z.number().int(),
  notes: z.string().nullable(),
});

export const AiDaySchema = z.object({
  name: z.string(),
  focus: z.string(),
  exercises: z.array(AiExerciseSchema),
});

export const AiPlanSchema = z.object({
  name: z.string(),
  summary: z.string(),
  days: z.array(AiDaySchema),
});
export type AiPlan = z.infer<typeof AiPlanSchema>;

/**
 * Plano da IA -> entrada do editor manual.
 *
 * A conversao existe pra que a validacao seja UMA so: o resultado passa pelo
 * CreatePlanSchema, o mesmo que o /plans/new usa. A regra fica sendo "um plano
 * gerado tem que ser um plano que o editor aceitaria" — sem reimplementar os
 * limites de series, o teto de descanso nem o regex de "8-12" num segundo
 * lugar, que so poderia divergir do primeiro com o tempo.
 *
 * O `summary` vira `notes` do plano: e o unico campo da IA sem correspondente,
 * e jogar fora a explicacao do treinador seria perder a melhor parte.
 */
export function aiPlanToCreateInput(
  plan: AiPlan,
  slugToId: Map<string, string>,
): CreatePlanInput {
  return {
    name: plan.name,
    notes: plan.summary,
    days: plan.days.map((d) => ({
      name: d.name,
      // A IA sempre manda focus (required em structured outputs); o plano aceita
      // null. String vazia vira null pra nao gravar "" como se fosse um foco.
      focus: d.focus.trim() || null,
      exercises: d.exercises.map((e) => ({
        // O `?? e.slug` nunca cai: quem chama isto ja validou que todo slug esta
        // no mapa. O fallback existe so pra satisfazer o tipo (get devolve
        // string | undefined) — um slug como exerciseId falharia no
        // assertExercisesExist logo depois, entao nem passaria calado.
        exerciseId: slugToId.get(e.slug) ?? e.slug,
        sets: e.sets,
        repScheme: e.repScheme,
        restSec: e.restSec,
        notes: e.notes,
      })),
    })),
  };
}

// ---------- entrada ----------

/**
 * POST /ai/plans/generate.
 *
 * O perfil NAO vem no body: vem do banco, pelo userId do JWT. Aceita-lo do
 * cliente deixaria alguem gerar um plano com dados que nao sao os dele.
 */
export const GeneratePlanSchema = z.object({
  /** Observacao livre pro treinador ("quero focar em ombro este mes"). */
  notes: z.string().max(500).nullable(),
});
export type GeneratePlanInput = z.infer<typeof GeneratePlanSchema>;
