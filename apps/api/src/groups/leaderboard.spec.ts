import { describe, expect, it } from "vitest";
import { rankMembers, type MemberScore } from "./leaderboard";

function score(
  userId: string,
  value: number,
  name: string | null = userId,
): MemberScore {
  return { userId, name, value };
}

describe("rankMembers", () => {
  it("devolve vazio pro grupo sem ninguem", () => {
    expect(rankMembers([])).toEqual([]);
  });

  it("ordena do maior pro menor", () => {
    const r = rankMembers([score("a", 10), score("b", 30), score("c", 20)]);

    expect(r.map((e) => e.userId)).toEqual(["b", "c", "a"]);
  });

  it("numera a posicao a partir de 1", () => {
    const r = rankMembers([score("a", 30), score("b", 20)]);

    expect(r.map((e) => e.position)).toEqual([1, 2]);
  });

  it("empatados dividem a posicao e a seguinte pula", () => {
    // Ranking de competicao: 1, 2, 2, 4 — quem vem depois de dois segundos
    // lugares e o quarto, nao o terceiro.
    const r = rankMembers([
      score("a", 30),
      score("b", 20),
      score("c", 20),
      score("d", 10),
    ]);

    expect(r.map((e) => e.position)).toEqual([1, 2, 2, 4]);
  });

  it("desempata por nome pra ordem nao depender do banco", () => {
    // Sem criterio estavel, dois empatados trocariam de lugar entre requisicoes
    // conforme a ordem que o Postgres devolvesse.
    const r = rankMembers([score("z", 20, "Zeca"), score("a", 20, "Ana")]);

    expect(r.map((e) => e.userId)).toEqual(["a", "z"]);
  });

  it("troca nome vazio por Anonimo", () => {
    const r = rankMembers([score("a", 10, null)]);

    expect(r[0].name).toBe("Anônimo");
  });

  it("poe os anonimos por ultimo no empate", () => {
    // O nome null nao pode virar string vazia e subir na frente de todo mundo.
    const r = rankMembers([score("a", 10, null), score("b", 10, "Bia")]);

    expect(r.map((e) => e.userId)).toEqual(["b", "a"]);
  });

  it("mede a distancia pro lider", () => {
    const r = rankMembers([score("a", 30), score("b", 20), score("c", 5)]);

    expect(r.map((e) => e.behindLeader)).toEqual([0, 10, 25]);
  });

  it("empata todo mundo em primeiro quando ninguem pontuou", () => {
    // Grupo recem-criado: nao pode inventar um lider.
    const r = rankMembers([score("a", 0), score("b", 0)]);

    expect(r.map((e) => e.position)).toEqual([1, 1]);
    expect(r.map((e) => e.behindLeader)).toEqual([0, 0]);
  });

  it("mantem quem nao treinou na lista, zerado", () => {
    // Sumir com o membro inativo esconderia do grupo quem parou de aparecer.
    const r = rankMembers([score("a", 50), score("b", 0)]);

    expect(r).toHaveLength(2);
    expect(r[1]).toMatchObject({ userId: "b", value: 0, position: 2 });
  });
});
