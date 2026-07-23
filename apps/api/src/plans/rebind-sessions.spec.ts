import { describe, expect, it } from "vitest";
import { resolveRebind, type DiaAntigo, type DiaNovo } from "./rebind-sessions";

const push: DiaAntigo = { id: "d1", name: "Push", order: 0 };
const pull: DiaAntigo = { id: "d2", name: "Pull", order: 1 };

function novo(id: string, name: string, order: number): DiaNovo {
  return { id, name, order };
}

describe("resolveRebind", () => {
  it("casa pelo nome, mesmo quando o order mudou", () => {
    // Inserir um dia novo no topo desloca todos os order. O nome e o que o
    // usuario reconhece como "o mesmo treino", entao ele vence.
    const destino = resolveRebind(push, [
      novo("n0", "Legs", 0),
      novo("n1", "Push", 1),
      novo("n2", "Pull", 2),
    ]);

    expect(destino).toBe("n1");
  });

  it("cai pro order quando o dia foi renomeado", () => {
    const destino = resolveRebind(push, [
      novo("n1", "Empurrar", 0),
      novo("n2", "Pull", 1),
    ]);

    expect(destino).toBe("n1");
  });

  it("cai pro order quando o nome ficou ambiguo", () => {
    // Dois "Push" — casar por nome seria escolher no chute. O order desempata.
    const destino = resolveRebind(pull, [
      novo("n1", "Push", 0),
      novo("n2", "Push", 1),
      novo("n3", "Push", 2),
    ]);

    expect(destino).toBe("n2");
  });

  it("devolve null quando o dia sumiu do plano", () => {
    const destino = resolveRebind(pull, [novo("n1", "Push", 0)]);

    expect(destino).toBeNull();
  });

  it("devolve null quando o plano ficou sem dias", () => {
    expect(resolveRebind(push, [])).toBeNull();
  });

  it("prefere o nome ao order quando os dois apontam para dias diferentes", () => {
    // O order 0 apontaria pro "Pull"; o nome aponta pro "Push". O nome ganha.
    const destino = resolveRebind(push, [
      novo("n1", "Pull", 0),
      novo("n2", "Push", 1),
    ]);

    expect(destino).toBe("n2");
  });
});
