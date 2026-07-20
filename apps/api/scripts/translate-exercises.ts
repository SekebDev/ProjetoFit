/**
 * Gerador one-off do artefato de traducao pt-BR dos exercicios.
 *
 * NAO roda em CI nem no deploy: e disparado a mao quando a biblioteca muda.
 * Baixa o mesmo dataset que o seed, manda nome+instrucoes em lote pra OpenAI
 * (modelo barato, ex.: gpt-5-mini) e grava
 * `prisma/exercise-translations.pt-BR.json` chaveado por slug. O seed le esse
 * JSON; o slug nunca e traduzido.
 *
 * Reaproveita o SDK `openai` (ja dependencia da API) e a mesma env
 * `OPENAI_API_KEY` do provider de IA.
 *
 * Uso:
 *   OPENAI_API_KEY=sk-... npx ts-node scripts/translate-exercises.ts
 *
 * Env opcionais:
 *   TRANSLATE_MODEL   modelo (default gpt-5-mini)
 *   TRANSLATE_BATCH   itens por requisicao (default 20)
 *   TRANSLATE_LIMIT   traduz so os N primeiros — use pra estimar custo antes
 *                     de rodar tudo (ex.: TRANSLATE_LIMIT=20)
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import OpenAI from "openai";
import {
  ExerciseTranslationSchema,
  type TranslationMap,
} from "../src/exercises/exercise-i18n";

const DB_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const OUT_PATH = join(__dirname, "..", "prisma", "exercise-translations.pt-BR.json");

const MODEL = process.env.TRANSLATE_MODEL ?? "gpt-5-mini";
const BATCH = Number(process.env.TRANSLATE_BATCH ?? "20");
const LIMIT = process.env.TRANSLATE_LIMIT
  ? Number(process.env.TRANSLATE_LIMIT)
  : Infinity;

interface FreeExercise {
  id: string;
  name: string;
  instructions: string[];
  images: string[];
}

interface ParaTraduzir {
  slug: string;
  name: string;
  instructions: string | null;
}

const SYSTEM_PROMPT = `
Você traduz uma biblioteca de exercícios de musculação do inglês para o
português do Brasil. Mantenha a terminologia técnica de academia consagrada
(ex.: "Bench Press" -> "Supino", "Row" -> "Remada", "Curl" -> "Rosca",
"Deadlift" -> "Levantamento Terra", "Lunge" -> "Afundo", "Squat" -> "Agachamento",
"Pulldown" -> "Puxada", "Fly/Flyes" -> "Crucifixo", "Raise" -> "Elevação",
"Extension" -> "Extensão", "Pushdown" -> "Tríceps na polia"). Preserve o sentido
das instruções, sem inventar passos.

Você recebe um objeto JSON { "items": [{slug, name, instructions}] } e responde
com um objeto JSON { "items": [{slug, name, instructions}] } com os MESMOS slugs,
traduzindo apenas name e instructions. Se instructions vier null, devolva null.
NUNCA altere o slug.
`.trim();

async function traduzLote(
  lote: ParaTraduzir[],
  client: OpenAI,
): Promise<{ traduzidos: ParaTraduzir[]; inTokens: number; outTokens: number }> {
  const res = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify({ items: lote }) },
    ],
  });

  const texto = res.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(texto) as { items?: ParaTraduzir[] };

  return {
    traduzidos: parsed.items ?? [],
    inTokens: res.usage?.prompt_tokens ?? 0,
    outTokens: res.usage?.completion_tokens ?? 0,
  };
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("Defina OPENAI_API_KEY no ambiente.");
  const client = new OpenAI({ apiKey });

  const res = await fetch(DB_URL);
  if (!res.ok) throw new Error(`Falha ao baixar dataset: ${res.status}`);
  const all = (await res.json()) as FreeExercise[];

  // Mesmo recorte do seed: so exercicios com imagem entram na biblioteca.
  const itens: ParaTraduzir[] = all
    .filter((e) => e.images && e.images.length > 0)
    .map((e) => ({
      slug: e.id,
      name: e.name,
      instructions: (e.instructions ?? []).join("\n") || null,
    }))
    .slice(0, LIMIT);

  console.log(
    `Traduzindo ${itens.length} exercicios em lotes de ${BATCH} com ${MODEL}...`,
  );

  const map: TranslationMap = {};
  let inTokens = 0;
  let outTokens = 0;
  let invalidos = 0;

  for (let i = 0; i < itens.length; i += BATCH) {
    const lote = itens.slice(i, i + BATCH);
    const { traduzidos, inTokens: it, outTokens: ot } = await traduzLote(
      lote,
      client,
    );
    inTokens += it;
    outTokens += ot;

    const porSlug = new Map(traduzidos.map((t) => [t.slug, t]));
    for (const original of lote) {
      const t = porSlug.get(original.slug);
      const parsed = ExerciseTranslationSchema.safeParse({
        name: t?.name,
        instructions: t?.instructions ?? null,
      });
      if (parsed.success) {
        map[original.slug] = parsed.data;
      } else {
        invalidos++;
        console.warn(`  slug sem traducao valida, fica em ingles: ${original.slug}`);
      }
    }
    console.log(`  ${Math.min(i + BATCH, itens.length)}/${itens.length}`);
  }

  // Ordena por slug pra o diff do JSON ser estavel entre execucoes.
  const ordenado: TranslationMap = {};
  for (const slug of Object.keys(map).sort()) {
    ordenado[slug] = map[slug];
  }
  writeFileSync(OUT_PATH, JSON.stringify(ordenado, null, 2) + "\n", "utf8");

  console.log(
    `\nPronto: ${Object.keys(ordenado).length} traduzidos, ${invalidos} em ingles.`,
  );
  console.log(
    `Tokens: ${inTokens} entrada + ${outTokens} saida. Escrito em ${OUT_PATH}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
