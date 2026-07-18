import { describe, expect, it } from "vitest";
import { evaluateUnlocks, progressFor, type UnlockStats } from "./unlock";
import { ACHIEVEMENTS } from "./catalog";

const ZERO: UnlockStats = {
  sessions: 0,
  streakBest: 0,
  prs: 0,
  volume: 0,
  earlyBird: 0,
};

function codes(stats: UnlockStats, jaTem: readonly string[] = []): string[] {
  return evaluateUnlocks(stats, jaTem)
    .map((a) => a.code)
    .sort();
}

describe("evaluateUnlocks", () => {
  it("nao desbloqueia nada com o usuario zerado", () => {
    expect(codes(ZERO)).toEqual([]);
  });

  it("desbloqueia o primeiro treino na primeira sessao", () => {
    expect(codes({ ...ZERO, sessions: 1 })).toEqual(["FIRST_WORKOUT"]);
  });

  it("nao repete o que ja esta desbloqueado", () => {
    expect(codes({ ...ZERO, sessions: 1 }, ["FIRST_WORKOUT"])).toEqual([]);
  });

  it("entrega de uma vez todos os degraus alcancados", () => {
    // Quem importa historico (ou passa muito tempo sem abrir) pode cruzar dois
    // limiares no mesmo fechamento — os dois tem que cair.
    expect(codes({ ...ZERO, sessions: 50 })).toEqual([
      "FIRST_WORKOUT",
      "WORKOUTS_10",
      "WORKOUTS_50",
    ]);
  });

  it("usa a MELHOR sequencia, nao a atual", () => {
    expect(codes({ ...ZERO, streakBest: 30 })).toEqual([
      "STREAK_30",
      "STREAK_7",
    ]);
  });

  it("desbloqueia por volume acumulado", () => {
    expect(codes({ ...ZERO, volume: 10_000 })).toEqual(["VOLUME_10T"]);
    expect(codes({ ...ZERO, volume: 100_000 })).toEqual([
      "VOLUME_100T",
      "VOLUME_10T",
    ]);
  });

  it("desbloqueia PRs por contagem acumulada", () => {
    expect(codes({ ...ZERO, prs: 1 })).toEqual(["FIRST_PR"]);
    expect(codes({ ...ZERO, prs: 10 })).toEqual(["FIRST_PR", "PRS_10"]);
  });

  it("desbloqueia o madrugador com o flag do treino", () => {
    expect(codes({ ...ZERO, earlyBird: 1 })).toEqual(["EARLY_BIRD"]);
  });

  it("ignora code desconhecido na lista de ja desbloqueados", () => {
    // Conquista removida do catalogo continua no banco do usuario; nao pode
    // atrapalhar a avaliacao das que sobraram.
    expect(codes({ ...ZERO, sessions: 1 }, ["CONQUISTA_APOSENTADA"])).toEqual([
      "FIRST_WORKOUT",
    ]);
  });
});

describe("progressFor", () => {
  const primeiroTreino = ACHIEVEMENTS.find((a) => a.code === "FIRST_WORKOUT")!;
  const cemTreinos = ACHIEVEMENTS.find((a) => a.code === "WORKOUTS_100")!;

  it("devolve o valor bruto da metrica enquanto falta", () => {
    expect(progressFor(cemTreinos, { ...ZERO, sessions: 42 })).toBe(42);
  });

  it("nao passa da meta depois de desbloqueada", () => {
    expect(progressFor(primeiroTreino, { ...ZERO, sessions: 87 })).toBe(1);
  });

  it("e zero pro usuario zerado", () => {
    expect(progressFor(cemTreinos, ZERO)).toBe(0);
  });
});
