import { describe, expect, it } from "vitest";
import { createSnake, type SnakeState, stepSnake, turn } from "./snake";

/** Comida fora do caminho imediato pra passos previsiveis. */
const foodNoCanto = () => 0; // spawnFood pega a primeira celula livre (0,0)

describe("snake", () => {
  it("move na direcao atual, um passo por tique", () => {
    const s = createSnake(15, 15, foodNoCanto);
    const cabecaAntes = s.snake[0];
    const depois = stepSnake(s, foodNoCanto);
    expect(depois.snake[0]).toEqual({ x: cabecaAntes.x + 1, y: cabecaAntes.y });
    expect(depois.snake.length).toBe(s.snake.length); // sem comer, nao cresce
  });

  it("ignora virada de 180° (nao come a si mesma na hora)", () => {
    const s = createSnake(); // andando RIGHT
    expect(turn(s, "LEFT").dir).toBe("RIGHT");
  });

  it("aceita virada perpendicular", () => {
    const s = createSnake();
    expect(turn(s, "UP").dir).toBe("UP");
  });

  it("comer cresce, pontua e reposiciona a comida", () => {
    // Cabeca em (5,5) indo RIGHT; comida logo a frente em (6,5).
    const s: SnakeState = {
      ...createSnake(15, 15, foodNoCanto),
      snake: [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
      ],
      dir: "RIGHT",
      food: { x: 6, y: 5 },
    };
    const depois = stepSnake(s, foodNoCanto);
    expect(depois.score).toBe(1);
    expect(depois.snake.length).toBe(3); // cresceu
    expect(depois.food).not.toEqual({ x: 6, y: 5 }); // reposicionou
  });

  it("morre ao bater na parede", () => {
    const s: SnakeState = {
      ...createSnake(15, 15, foodNoCanto),
      snake: [
        { x: 14, y: 5 },
        { x: 13, y: 5 },
      ],
      dir: "RIGHT",
      food: { x: 0, y: 0 },
    };
    expect(stepSnake(s, foodNoCanto).dead).toBe(true);
  });

  it("morre ao bater no proprio corpo", () => {
    // Cobra em U: cabeca prestes a entrar na propria celula.
    const s: SnakeState = {
      ...createSnake(15, 15, foodNoCanto),
      snake: [
        { x: 5, y: 5 },
        { x: 5, y: 6 },
        { x: 6, y: 6 },
        { x: 6, y: 5 },
        { x: 6, y: 4 },
      ],
      dir: "DOWN",
      food: { x: 0, y: 0 },
    };
    // Indo DOWN, a cabeca (5,5)->(5,6) bate no proprio corpo.
    expect(stepSnake(s, foodNoCanto).dead).toBe(true);
  });

  it("uma cobra morta fica congelada", () => {
    const morta: SnakeState = { ...createSnake(), dead: true };
    expect(stepSnake(morta)).toBe(morta);
    expect(turn(morta, "UP")).toBe(morta);
  });

  it("nao muta o estado de entrada", () => {
    const s = createSnake(15, 15, foodNoCanto);
    const copia = structuredClone(s);
    stepSnake(s, foodNoCanto);
    expect(s).toEqual(copia);
  });
});
