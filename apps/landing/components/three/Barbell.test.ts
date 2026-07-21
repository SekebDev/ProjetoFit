import { describe, expect, it } from "vitest";
import { BRAND } from "@/lib/palette";
import { PLATES } from "./Barbell";

describe("Barbell (dados das anilhas)", () => {
  it("tem 6 anilhas, uma por cor de grupo muscular", () => {
    expect(PLATES).toHaveLength(6);

    const cores = new Set(PLATES.map((p) => p.cor));
    const grupos = [
      BRAND.chest,
      BRAND.back,
      BRAND.shoulders,
      BRAND.arms,
      BRAND.legs,
      BRAND.core,
    ];
    for (const cor of grupos) {
      expect(cores.has(cor)).toBe(true);
    }
  });

  it("é simétrica: 3 anilhas por lado com os mesmos raios", () => {
    const esq = PLATES.filter((p) => p.lado === -1);
    const dir = PLATES.filter((p) => p.lado === 1);

    expect(esq).toHaveLength(3);
    expect(dir).toHaveLength(3);
    expect(esq.map((p) => p.raio)).toEqual(dir.map((p) => p.raio));
  });

  it("os raios decrescem do miolo pra ponta (slot 0 → 2)", () => {
    for (const lado of [-1, 1] as const) {
      const raios = PLATES.filter((p) => p.lado === lado)
        .sort((a, b) => a.slot - b.slot)
        .map((p) => p.raio);
      const ordenado = [...raios].sort((a, b) => b - a);
      expect(raios).toEqual(ordenado);
    }
  });
});
