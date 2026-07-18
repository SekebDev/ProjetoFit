import { describe, expect, it } from "vitest";
import { computeSessionXp, levelFor, xpForLevel } from "./xp";

describe("computeSessionXp", () => {
  it("paga so a base quando o treino nao teve serie nem PR", () => {
    expect(computeSessionXp({ setCount: 0, prCount: 0, streak: 0 })).toBe(50);
  });

  it("soma 5 por serie e 25 por PR", () => {
    // 50 + 5*12 + 25*2 = 160
    expect(computeSessionXp({ setCount: 12, prCount: 2, streak: 0 })).toBe(160);
  });

  it("aplica +2% por dia de sequencia", () => {
    // base 100, sequencia 10 -> x1.20
    expect(computeSessionXp({ setCount: 10, prCount: 0, streak: 10 })).toBe(120);
  });

  it("limita o bonus da sequencia em +50%", () => {
    // sequencia 200 daria x5; o teto segura em x1.5
    expect(computeSessionXp({ setCount: 10, prCount: 0, streak: 200 })).toBe(
      150,
    );
  });

  it("arredonda pra inteiro — XP fracionado nao existe", () => {
    // base 55, sequencia 1 -> 55 * 1.02 = 56.1
    expect(computeSessionXp({ setCount: 1, prCount: 0, streak: 1 })).toBe(56);
  });

  it("ignora sequencia negativa em vez de descontar XP", () => {
    expect(computeSessionXp({ setCount: 10, prCount: 0, streak: -5 })).toBe(100);
  });
});

describe("levelFor", () => {
  it("comeca no nivel 1 com XP zero", () => {
    expect(levelFor(0)).toBe(1);
  });

  it("sobe de nivel nos quadrados perfeitos x100", () => {
    expect(levelFor(99)).toBe(1);
    expect(levelFor(100)).toBe(2);
    expect(levelFor(399)).toBe(2);
    expect(levelFor(400)).toBe(3);
    expect(levelFor(900)).toBe(4);
  });

  it("nao quebra com XP negativo", () => {
    expect(levelFor(-10)).toBe(1);
  });
});

describe("xpForLevel", () => {
  it("e o inverso de levelFor na fronteira de cada nivel", () => {
    for (let nivel = 1; nivel <= 20; nivel += 1) {
      const limiar = xpForLevel(nivel);
      expect(levelFor(limiar)).toBe(nivel);
      // Um XP a menos ainda e o nivel anterior (exceto no primeiro, que e o piso).
      if (nivel > 1) expect(levelFor(limiar - 1)).toBe(nivel - 1);
    }
  });

  it("exige 0 XP pro nivel 1", () => {
    expect(xpForLevel(1)).toBe(0);
  });
});
