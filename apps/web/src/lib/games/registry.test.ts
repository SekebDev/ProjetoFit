import { describe, expect, it } from "vitest";
import { pickDopamineGame } from "./registry";

describe("pickDopamineGame", () => {
  it("sorteia so entre os jogos habilitados", () => {
    // rng=0 pega o primeiro do pool.
    expect(pickDopamineGame(["SNAKE"], () => 0)).toBe("SNAKE");
  });

  it("lista vazia = sorteia entre todos", () => {
    expect(pickDopamineGame([], () => 0)).toBe("FLAPPY");
  });

  it("ignora ids desconhecidos (schema antigo)", () => {
    // So "FLAPPY" e valido; "PONG" cai fora e o pool vira ["FLAPPY"].
    expect(pickDopamineGame(["PONG", "FLAPPY"], () => 0.99)).toBe("FLAPPY");
  });

  it("todos invalidos = cai no sorteio geral, nunca null com jogos existentes", () => {
    expect(pickDopamineGame(["PONG"], () => 0)).toBe("FLAPPY");
  });
});
