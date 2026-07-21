// Motor puro do Snake do Modo Dopamina. Grade discreta, sem canvas nem relogio.
// O componente (SnakeGame.tsx) so desenha e chama `turn`/`step` num intervalo.

export type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
export interface Cell {
  x: number;
  y: number;
}
export interface SnakeState {
  /** Cabeca primeiro. */
  snake: Cell[];
  dir: Dir;
  food: Cell;
  score: number;
  dead: boolean;
  cols: number;
  rows: number;
}

const DELTA: Record<Dir, Cell> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const OPOSTA: Record<Dir, Dir> = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

/** 0..1, injetavel pra testar sem aleatorio. */
export type Rng = () => number;
const defaultRng: Rng = Math.random;

function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Sorteia uma celula livre (que a cobra nao ocupa). */
function spawnFood(snake: Cell[], cols: number, rows: number, rng: Rng): Cell {
  const livres: Cell[] = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cell = { x, y };
      if (!snake.some((s) => sameCell(s, cell))) livres.push(cell);
    }
  }
  if (livres.length === 0) return snake[0]; // grade cheia: venceu, nao trava
  return livres[Math.floor(rng() * livres.length)];
}

export function createSnake(
  cols = 15,
  rows = 15,
  rng: Rng = defaultRng,
): SnakeState {
  const meio = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
  const snake = [meio, { x: meio.x - 1, y: meio.y }];
  return {
    snake,
    dir: "RIGHT",
    food: spawnFood(snake, cols, rows, rng),
    score: 0,
    dead: false,
    cols,
    rows,
  };
}

/** Vira, ignorando o 180° (que seria suicidio instantaneo). */
export function turn(state: SnakeState, dir: Dir): SnakeState {
  if (state.dead || dir === OPOSTA[state.dir] || dir === state.dir) return state;
  return { ...state, dir };
}

/**
 * Um tique: move a cabeca, come (cresce + ponto + nova comida), e morre ao
 * bater na parede ou no proprio corpo. Puro — nunca muta o estado de entrada.
 */
export function stepSnake(state: SnakeState, rng: Rng = defaultRng): SnakeState {
  if (state.dead) return state;

  const d = DELTA[state.dir];
  const cabeca = { x: state.snake[0].x + d.x, y: state.snake[0].y + d.y };

  const bateuParede =
    cabeca.x < 0 ||
    cabeca.y < 0 ||
    cabeca.x >= state.cols ||
    cabeca.y >= state.rows;
  if (bateuParede) return { ...state, dead: true };

  const vaiComer = sameCell(cabeca, state.food);
  // Sem comer, a cauda anda junto — entao a celula que ela libera nao conta como
  // colisao. Com comer, o corpo inteiro permanece.
  const corpo = vaiComer ? state.snake : state.snake.slice(0, -1);
  if (corpo.some((s) => sameCell(s, cabeca))) {
    return { ...state, dead: true };
  }

  const snake = [cabeca, ...corpo];
  if (!vaiComer) {
    return { ...state, snake };
  }
  return {
    ...state,
    snake,
    score: state.score + 1,
    food: spawnFood(snake, state.cols, state.rows, rng),
  };
}
