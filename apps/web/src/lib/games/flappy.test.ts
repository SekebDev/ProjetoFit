import { describe, expect, it } from "vitest";
import {
  createFlappy,
  FLAPPY,
  flap,
  type FlappyState,
  stepFlappy,
} from "./flappy";

describe("flappy", () => {
  it("a gravidade puxa o passaro pra baixo com o tempo", () => {
    const inicial = createFlappy();
    const depois = stepFlappy(inicial, 100);
    expect(depois.velocity).toBeGreaterThan(inicial.velocity);
    expect(depois.birdY).toBeGreaterThan(inicial.birdY);
  });

  it("o flap dá velocidade pra cima (negativa)", () => {
    const impulsionado = flap(createFlappy());
    expect(impulsionado.velocity).toBe(FLAPPY.flapImpulse);
    expect(impulsionado.velocity).toBeLessThan(0);
  });

  it("morre ao bater no chao", () => {
    // Comeca quase no chao, sem flap: um passo o derruba.
    const quaseNoChao: FlappyState = {
      ...createFlappy(),
      birdY: FLAPPY.world - FLAPPY.birdRadius - 0.5,
      velocity: 0.1,
    };
    expect(stepFlappy(quaseNoChao, 100).dead).toBe(true);
  });

  it("morre ao encostar no teto", () => {
    const quaseNoTeto: FlappyState = {
      ...createFlappy(),
      birdY: FLAPPY.birdRadius + 0.2,
      velocity: -0.1,
    };
    expect(stepFlappy(quaseNoTeto, 100).dead).toBe(true);
  });

  it("conta ponto ao passar de um cano, uma vez so", () => {
    // Cano prestes a cruzar o passaro; abertura no centro pra nao colidir.
    const state: FlappyState = {
      ...createFlappy(),
      birdY: FLAPPY.world / 2,
      pipes: [
        {
          x: FLAPPY.birdX - FLAPPY.pipeWidth + 0.1,
          gapY: FLAPPY.world / 2,
          passed: false,
        },
      ],
    };
    const depois = stepFlappy(state, 30);
    expect(depois.score).toBe(1);
    // Passos seguintes nao recontam o mesmo cano.
    const maisUm = stepFlappy(depois, 30);
    expect(maisUm.score).toBe(1);
  });

  it("morre ao bater num cano fora da abertura", () => {
    const state: FlappyState = {
      ...createFlappy(),
      birdY: 10, // bem no alto, fora de uma abertura centralizada
      pipes: [{ x: FLAPPY.birdX, gapY: FLAPPY.world / 2, passed: false }],
    };
    expect(stepFlappy(state, 16).dead).toBe(true);
  });

  it("um passaro morto nao se move mais (estado congelado)", () => {
    const morto: FlappyState = { ...createFlappy(), dead: true };
    expect(stepFlappy(morto, 100)).toBe(morto);
    expect(flap(morto)).toBe(morto);
  });

  it("nao muta o estado de entrada", () => {
    const inicial = createFlappy();
    const copia = structuredClone(inicial);
    stepFlappy(inicial, 100);
    expect(inicial).toEqual(copia);
  });
});
