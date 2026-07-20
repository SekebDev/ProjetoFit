import { describe, expect, it } from "vitest";
import translations from "../../prisma/exercise-translations.pt-BR.json";
import { TranslationMapSchema } from "./exercise-i18n";

/**
 * Guarda o artefato versionado: o script de traducao (ou uma correcao a mao)
 * nunca pode deixar o JSON num formato que o seed nao consiga carregar. Vazio
 * (`{}`) e valido de proposito — significa "tudo em ingles ainda".
 */
describe("exercise-translations.pt-BR.json", () => {
  it("bate com o TranslationMapSchema", () => {
    const parsed = TranslationMapSchema.safeParse(translations);
    expect(parsed.success).toBe(true);
  });
});
