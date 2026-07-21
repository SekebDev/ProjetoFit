import { describe, expect, it } from "vitest";
import { swipeDir, SWIPE_LIMIAR } from "./swipe";

describe("swipeDir", () => {
  it("arrasto pra direita vira RIGHT", () => {
    expect(swipeDir(40, 0)).toBe("RIGHT");
  });

  it("arrasto pra esquerda vira LEFT", () => {
    expect(swipeDir(-40, 5)).toBe("LEFT");
  });

  it("arrasto pra baixo vira DOWN (y do DOM cresce pra baixo)", () => {
    expect(swipeDir(0, 40)).toBe("DOWN");
  });

  it("arrasto pra cima vira UP", () => {
    expect(swipeDir(5, -40)).toBe("UP");
  });

  it("abaixo do limiar não vira (null)", () => {
    expect(swipeDir(10, 10)).toBeNull();
    expect(swipeDir(SWIPE_LIMIAR - 1, SWIPE_LIMIAR - 1)).toBeNull();
  });

  it("o eixo dominante vence mesmo com o outro acima do limiar", () => {
    // dx passou do limiar, mas dy é bem maior: manda a vertical.
    expect(swipeDir(30, 100)).toBe("DOWN");
    expect(swipeDir(100, -30)).toBe("RIGHT");
  });

  it("empate exato resolve na horizontal (estável)", () => {
    expect(swipeDir(40, 40)).toBe("RIGHT");
    expect(swipeDir(-40, -40)).toBe("LEFT");
  });

  it("limiar customizado é respeitado", () => {
    expect(swipeDir(30, 0, 50)).toBeNull();
    expect(swipeDir(60, 0, 50)).toBe("RIGHT");
  });
});
