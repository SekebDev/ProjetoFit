import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ProgressService } from "./progress.service";

/**
 * O que este spec NAO testa: se as agregacoes estao certas.
 *
 * A logica do ProgressService e SQL — volume, PR, fatiamento por semana.
 * Mockar o $queryRaw e conferir que o mapper devolve o que o proprio mock
 * inventou seria uma tautologia. A correcao das queries e verificada contra um
 * Postgres real em test/progress.e2e-spec.ts, que e onde ela pode falhar.
 *
 * Aqui fica so o que existe em TypeScript: o 404, a inversao da ordem e o
 * tratamento de nulo nos mappers.
 */
const SUPINO = { id: "e1", name: "Supino reto" };

interface Over {
  /** Ausente = existe. Presente e null = 404. */
  exercise?: unknown;
  /** Linhas do byExercise. */
  points?: unknown[];
  /** Linhas do weeklyVolume — 1a chamada do $queryRaw dentro do summary. */
  weeks?: unknown[];
  /** Linhas do records — 2a chamada do $queryRaw dentro do summary. */
  records?: unknown[];
  count?: number;
}

function criaService(over: Over = {}) {
  // O summary dispara duas queries cruas na ordem weeklyVolume -> records, e o
  // byExercise dispara uma so. Um unico mockResolvedValue serviria a mesma
  // resposta pras duas e o weeklyVolume receberia linha de PR — por isso o
  // mock responde por chamada.
  const $queryRaw = vi
    .fn()
    .mockResolvedValueOnce(over.points ?? over.weeks ?? [])
    .mockResolvedValueOnce(over.records ?? []);

  const prisma = {
    exercise: {
      findUnique: vi
        .fn()
        .mockResolvedValue("exercise" in over ? over.exercise : SUPINO),
    },
    workoutSession: { count: vi.fn().mockResolvedValue(over.count ?? 0) },
    $queryRaw,
  };
  return { service: new ProgressService(prisma as never), prisma };
}

function pontoCru(over: Record<string, unknown> = {}) {
  return {
    sessionId: "s1",
    date: new Date("2026-06-01T12:00:00.000Z"),
    maxWeightKg: 60,
    volume: 600,
    totalReps: 10,
    setCount: 1,
    ...over,
  };
}

describe("ProgressService", () => {
  describe("byExercise", () => {
    it("rejeita exercicio inexistente com 404", async () => {
      const { service } = criaService({ exercise: null });

      await expect(service.byExercise("u1", "nao-existe")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("inverte a ordem: o banco devolve DESC, o grafico le ASC", async () => {
      // O LIMIT precisa cortar as sessoes ANTIGAS, entao a query e DESC. Mas o
      // grafico le da esquerda pra direita — quem inverte e o service.
      const { service } = criaService({
        points: [
          pontoCru({
            sessionId: "novo",
            date: new Date("2026-06-10T12:00:00Z"),
          }),
          pontoCru({
            sessionId: "velho",
            date: new Date("2026-06-01T12:00:00Z"),
          }),
        ],
      });

      const res = await service.byExercise("u1", "e1");

      expect(res.points.map((p) => p.sessionId)).toEqual(["velho", "novo"]);
    });

    it("preserva volume null em vez de trocar por 0", async () => {
      const { service } = criaService({
        points: [pontoCru({ maxWeightKg: null, volume: null })],
      });

      const res = await service.byExercise("u1", "e1");

      expect(res.points[0].volume).toBeNull();
      expect(res.points[0].maxWeightKg).toBeNull();
    });

    it("serializa a data como ISO", async () => {
      const { service } = criaService({ points: [pontoCru()] });

      const res = await service.byExercise("u1", "e1");

      expect(res.points[0].date).toBe("2026-06-01T12:00:00.000Z");
    });

    it("devolve o exercicio junto, pra tela ter o nome sem outra chamada", async () => {
      const { service } = criaService({ points: [] });

      const res = await service.byExercise("u1", "e1");

      expect(res).toEqual({ exercise: SUPINO, points: [] });
    });
  });

  describe("summary", () => {
    it("conta so as sessoes encerradas", async () => {
      const { service, prisma } = criaService({ count: 7 });

      const res = await service.summary("u1", "America/Sao_Paulo");

      expect(res.totalSessions).toBe(7);
      expect(prisma.workoutSession.count).toHaveBeenCalledWith({
        where: { userId: "u1", finishedAt: { not: null } },
      });
    });

    it("nao vaza Date cru do PR: converte pra ISO e mantem null como null", async () => {
      const { service } = criaService({
        weeks: [],
        records: [
          {
            id: "e1",
            name: "Supino reto",
            maxWeightKg: 90,
            maxWeightDate: new Date("2026-06-08T12:00:00.000Z"),
            // Carga registrada sem reps: ha PR de carga, mas nao de volume.
            maxVolume: null,
            maxVolumeDate: null,
          },
        ],
      });

      const res = await service.summary("u1", "America/Sao_Paulo");

      expect(res.records[0]).toEqual({
        exercise: SUPINO,
        maxWeightKg: 90,
        maxWeightDate: "2026-06-08T12:00:00.000Z",
        maxVolume: null,
        maxVolumeDate: null,
      });
    });
  });
});
