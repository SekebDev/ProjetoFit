import type { CreateMetricInput } from "@workout/shared";
import { describe, expect, it, vi } from "vitest";
import { MetricsService } from "./metrics.service";

const LINHA = {
  id: "m1",
  date: new Date("2026-07-15T17:31:13.000Z"),
  weightKg: 82.5,
  bodyFat: 18.2,
  leanMassKg: 67.5,
  waistCm: 84,
  armCm: 38,
  chestCm: 104,
  thighCm: 58,
  notes: null,
};

/**
 * Entrada completa com tudo nulo, sobrescrevendo so o que o teste liga.
 *
 * Todo campo e nullable e nao opcional, entao o literal precisa citar todos —
 * sem este helper, cada medida nova quebraria todo teste que monta uma entrada.
 */
function entrada(over: Partial<CreateMetricInput> = {}): CreateMetricInput {
  return {
    weightKg: null,
    bodyFat: null,
    leanMassKg: null,
    waistCm: null,
    armCm: null,
    chestCm: null,
    thighCm: null,
    notes: null,
    ...over,
  };
}

function criaService(rows: unknown[] = []) {
  const prisma = {
    bodyMetric: {
      create: vi.fn().mockResolvedValue(LINHA),
      findMany: vi.fn().mockResolvedValue(rows),
    },
  };
  return { service: new MetricsService(prisma as never), prisma };
}

describe("MetricsService", () => {
  describe("create", () => {
    it("grava a metrica no usuario do token", async () => {
      const { service, prisma } = criaService();

      await service.create("u1", entrada({ weightKg: 82.5, bodyFat: 18.2 }));

      expect(prisma.bodyMetric.create).toHaveBeenCalledWith({
        data: { userId: "u1", ...entrada({ weightKg: 82.5, bodyFat: 18.2 }) },
      });
    });

    it("grava a composicao corporal inteira", async () => {
      const { service, prisma } = criaService();

      await service.create(
        "u1",
        entrada({ waistCm: 84, armCm: 38, chestCm: 104, thighCm: 58 }),
      );

      expect(prisma.bodyMetric.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          waistCm: 84,
          armCm: 38,
          chestCm: 104,
          thighCm: 58,
        }),
      });
    });

    it("devolve a data como ISO, nao como Date", async () => {
      const { service } = criaService();

      const res = await service.create("u1", entrada({ weightKg: 82.5 }));

      expect(res.date).toBe("2026-07-15T17:31:13.000Z");
    });

    it("devolve as medidas de composicao gravadas", async () => {
      const { service } = criaService();

      const res = await service.create("u1", entrada({ waistCm: 84 }));

      // O mapper e escrito campo a campo: se uma medida nova entrar no schema e
      // nao no toMetric, ela seria gravada e nunca devolvida.
      expect(res).toMatchObject({
        leanMassKg: 67.5,
        waistCm: 84,
        armCm: 38,
        chestCm: 104,
        thighCm: 58,
      });
    });
  });

  describe("findAll", () => {
    it("busca so as do usuario, com teto e da mais recente pra mais antiga", async () => {
      // O desc nao e cosmetico: e o que faz o `take` cortar as medidas antigas
      // em vez das recentes quando alguem passa do teto.
      const { service, prisma } = criaService([LINHA]);

      await service.findAll("u1");

      expect(prisma.bodyMetric.findMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        orderBy: { date: "desc" },
        take: 500,
      });
    });

    it("preserva bodyFat null", async () => {
      const { service } = criaService([{ ...LINHA, bodyFat: null }]);

      const res = await service.findAll("u1");

      expect(res[0].bodyFat).toBeNull();
      expect(res[0].weightKg).toBe(82.5);
    });
  });
});
