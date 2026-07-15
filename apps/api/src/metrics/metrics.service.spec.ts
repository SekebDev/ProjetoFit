import { describe, expect, it, vi } from "vitest";
import { MetricsService } from "./metrics.service";

const LINHA = {
  id: "m1",
  date: new Date("2026-07-15T17:31:13.000Z"),
  weightKg: 82.5,
  bodyFat: 18.2,
  notes: null,
};

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

      await service.create("u1", {
        weightKg: 82.5,
        bodyFat: 18.2,
        notes: null,
      });

      expect(prisma.bodyMetric.create).toHaveBeenCalledWith({
        data: { userId: "u1", weightKg: 82.5, bodyFat: 18.2, notes: null },
      });
    });

    it("devolve a data como ISO, nao como Date", async () => {
      const { service } = criaService();

      const res = await service.create("u1", {
        weightKg: 82.5,
        bodyFat: 18.2,
        notes: null,
      });

      expect(res.date).toBe("2026-07-15T17:31:13.000Z");
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
