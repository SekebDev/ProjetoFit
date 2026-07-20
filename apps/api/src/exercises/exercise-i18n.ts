import { z } from "zod";

/**
 * Traducao pt-BR de um exercicio da biblioteca. `instructions` e nullable
 * porque nem todo exercicio da fonte (Free Exercise DB) tem instrucoes — e a
 * traducao preserva essa ausencia.
 */
export const ExerciseTranslationSchema = z.object({
  name: z.string().min(1),
  instructions: z.string().nullable(),
});
export type ExerciseTranslation = z.infer<typeof ExerciseTranslationSchema>;

/**
 * Mapa `slug -> traducao`. O slug (id do dataset) e a chave estavel entre a
 * fonte em ingles e o artefato pt-BR: nomes mudam, o slug nao.
 */
export const TranslationMapSchema = z.record(
  z.string(),
  ExerciseTranslationSchema,
);
export type TranslationMap = z.infer<typeof TranslationMapSchema>;

interface Traduzivel {
  slug: string;
  name: string;
  instructions: string | null;
}

/**
 * Sobrepoe nome e instrucoes em pt-BR quando ha traducao pro slug; senao
 * mantem o ingles da fonte. Nunca toca `slug` (chave natural do upsert) nem
 * os demais campos. Imutavel: devolve uma copia.
 *
 * Fallback campo a campo de proposito: uma traducao com `instructions` nula
 * nao apaga a instrucao que existia em ingles — sumir com o texto seria pior
 * que exibi-lo no idioma errado.
 */
export function applyTranslation<T extends Traduzivel>(
  row: T,
  translations: TranslationMap,
): T {
  const traducao = translations[row.slug];
  if (!traducao) return row;
  return {
    ...row,
    name: traducao.name,
    instructions: traducao.instructions ?? row.instructions,
  };
}
