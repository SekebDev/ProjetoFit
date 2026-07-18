import { describe, expect, it } from "vitest";
import { generateInviteCode, normalizeInviteCode } from "./invite-code";

describe("generateInviteCode", () => {
  it("tem 8 caracteres", () => {
    expect(generateInviteCode()).toHaveLength(8);
  });

  it("usa so o alfabeto sem simbolos confundiveis", () => {
    // 100 sorteios: um simbolo proibido escapando em 1 de cada 31 posicoes
    // apareceria aqui com folga.
    for (let i = 0; i < 100; i += 1) {
      expect(generateInviteCode()).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
    }
  });

  it("nunca sorteia os pares que se confundem ao ditar", () => {
    const proibidos = ["0", "O", "1", "I", "L"];
    const amostra = Array.from({ length: 200 }, () => generateInviteCode());

    for (const simbolo of proibidos) {
      expect(amostra.some((c) => c.includes(simbolo))).toBe(false);
    }
  });

  it("nao repete codigo entre sorteios", () => {
    // 31^8 combinacoes: repetir em 500 sorteios seria sinal de gerador travado
    // (semente fixa, ou o mesmo indice saindo sempre).
    const amostra = new Set(
      Array.from({ length: 500 }, () => generateInviteCode()),
    );
    expect(amostra.size).toBe(500);
  });

  it("varia todas as posicoes, nao so as primeiras", () => {
    // Trava um gerador que sorteasse so o comeco e completasse o resto fixo.
    const amostra = Array.from({ length: 200 }, () => generateInviteCode());

    for (let posicao = 0; posicao < 8; posicao += 1) {
      const distintos = new Set(amostra.map((c) => c[posicao]));
      expect(distintos.size).toBeGreaterThan(1);
    }
  });
});

describe("normalizeInviteCode", () => {
  it("sobe pra maiuscula", () => {
    expect(normalizeInviteCode("k7m2qx9p")).toBe("K7M2QX9P");
  });

  it("tira espaco e hifen de quem colou de uma mensagem", () => {
    expect(normalizeInviteCode(" K7M2-QX9P ")).toBe("K7M2QX9P");
  });

  it("descarta pontuacao solta", () => {
    expect(normalizeInviteCode("K7M2.QX9P!")).toBe("K7M2QX9P");
  });

  it("devolve vazio quando nao sobra nada aproveitavel", () => {
    expect(normalizeInviteCode("---")).toBe("");
  });
});
