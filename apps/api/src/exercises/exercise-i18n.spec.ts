import { describe, expect, it } from "vitest";
import {
  applyTranslation,
  TranslationMapSchema,
  type TranslationMap,
} from "./exercise-i18n";

function row(over: Record<string, unknown> = {}) {
  return {
    slug: "Barbell_Bench_Press",
    name: "Barbell Bench Press",
    instructions: "Lie on the bench.",
    ...over,
  };
}

describe("applyTranslation", () => {
  const map: TranslationMap = {
    Barbell_Bench_Press: {
      name: "Supino com Barra",
      instructions: "Deite no banco.",
    },
  };

  it("sobrepoe nome e instrucoes em pt-BR quando ha traducao", () => {
    const res = applyTranslation(row(), map);
    expect(res.name).toBe("Supino com Barra");
    expect(res.instructions).toBe("Deite no banco.");
  });

  it("mantem o ingles quando o slug nao tem traducao", () => {
    const res = applyTranslation(row({ slug: "desconhecido" }), map);
    expect(res.name).toBe("Barbell Bench Press");
    expect(res.instructions).toBe("Lie on the bench.");
  });

  it("nunca altera o slug nem os demais campos", () => {
    const res = applyTranslation(row({ muscleGroup: "CHEST" }), map);
    expect(res.slug).toBe("Barbell_Bench_Press");
    expect((res as unknown as { muscleGroup: string }).muscleGroup).toBe("CHEST");
  });

  it("nao muta o objeto de entrada", () => {
    const original = row();
    applyTranslation(original, map);
    expect(original.name).toBe("Barbell Bench Press");
  });

  it("mantem a instrucao inglesa quando a traducao tem instructions nula", () => {
    const semInstrucao: TranslationMap = {
      Barbell_Bench_Press: { name: "Supino com Barra", instructions: null },
    };
    const res = applyTranslation(row(), semInstrucao);
    expect(res.name).toBe("Supino com Barra");
    expect(res.instructions).toBe("Lie on the bench.");
  });
});

describe("TranslationMapSchema", () => {
  it("aceita um mapa valido", () => {
    const parsed = TranslationMapSchema.safeParse({
      slug1: { name: "Nome", instructions: null },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    const parsed = TranslationMapSchema.safeParse({
      slug1: { name: "", instructions: null },
    });
    expect(parsed.success).toBe(false);
  });
});
