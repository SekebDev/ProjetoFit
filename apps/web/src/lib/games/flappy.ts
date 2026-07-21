// Motor puro do Flappy do Modo Dopamina. Sem canvas, sem React, sem relogio:
// so o estado e as transicoes, pra dar pra testar a fisica isolada. O
// componente (FlappyGame.tsx) so desenha o estado e chama `step`/`flap`.
//
// Coordenadas num mundo fixo 100x100; o canvas escala na hora de desenhar. O
// passaro fica parado no eixo X (birdX) e o mundo corre pra esquerda — e a
// ilusao classica do Flappy.

export interface Pipe {
  /** Borda esquerda do cano, em unidades de mundo. */
  x: number;
  /** Centro da abertura, em unidades de mundo. */
  gapY: number;
  /** Se o passaro ja passou por ele (pra contar ponto uma vez so). */
  passed: boolean;
}

export interface FlappyState {
  birdY: number;
  velocity: number;
  pipes: Pipe[];
  score: number;
  dead: boolean;
}

export const FLAPPY = {
  world: 100,
  birdX: 25,
  birdRadius: 4,
  gravity: 0.0009, // por ms^2
  flapImpulse: -0.32,
  pipeSpeed: 0.018, // unidades de mundo por ms
  pipeWidth: 14,
  gapHeight: 34,
  pipeSpacing: 55, // distancia horizontal entre canos
} as const;

/** Onde nasce a abertura do proximo cano. Injetavel pra testar sem aleatorio. */
export type NextGap = () => number;

const centerGap: NextGap = () => FLAPPY.world / 2;

export function createFlappy(nextGap: NextGap = centerGap): FlappyState {
  return {
    birdY: FLAPPY.world / 2,
    velocity: 0,
    pipes: [{ x: FLAPPY.world, gapY: nextGap(), passed: false }],
    score: 0,
    dead: false,
  };
}

/** Dá o impulso pra cima. Num passaro morto nao faz nada. */
export function flap(state: FlappyState): FlappyState {
  if (state.dead) return state;
  return { ...state, velocity: FLAPPY.flapImpulse };
}

function hitsPipe(birdY: number, pipe: Pipe): boolean {
  const withinX =
    FLAPPY.birdX + FLAPPY.birdRadius > pipe.x &&
    FLAPPY.birdX - FLAPPY.birdRadius < pipe.x + FLAPPY.pipeWidth;
  if (!withinX) return false;
  const half = FLAPPY.gapHeight / 2;
  const acimaDaAbertura = birdY - FLAPPY.birdRadius < pipe.gapY - half;
  const abaixoDaAbertura = birdY + FLAPPY.birdRadius > pipe.gapY + half;
  return acimaDaAbertura || abaixoDaAbertura;
}

/**
 * Avanca `dtMs` de simulacao. Puro: devolve um estado novo, nunca muta o de
 * entrada. Aplica gravidade, move os canos, recicla o que saiu, conta ponto ao
 * passar, e mata ao bater no chao, no teto ou num cano.
 */
export function stepFlappy(
  state: FlappyState,
  dtMs: number,
  nextGap: NextGap = centerGap,
): FlappyState {
  if (state.dead) return state;

  const velocity = state.velocity + FLAPPY.gravity * dtMs;
  const birdY = state.birdY + velocity * dtMs;

  // Chao ou teto: morre.
  if (
    birdY + FLAPPY.birdRadius >= FLAPPY.world ||
    birdY - FLAPPY.birdRadius <= 0
  ) {
    return { ...state, birdY, velocity, dead: true };
  }

  const dx = FLAPPY.pipeSpeed * dtMs;
  let score = state.score;
  const pipes = state.pipes
    .map((p) => {
      const x = p.x - dx;
      const passou = !p.passed && x + FLAPPY.pipeWidth < FLAPPY.birdX;
      if (passou) score += 1;
      return { ...p, x, passed: p.passed || passou };
    })
    // Descarta cano que saiu inteiro pela esquerda.
    .filter((p) => p.x + FLAPPY.pipeWidth > 0);

  // Repoe o cano da direita mantendo o espacamento.
  const maisADireita = pipes.reduce((max, p) => Math.max(max, p.x), 0);
  if (maisADireita <= FLAPPY.world - FLAPPY.pipeSpacing) {
    pipes.push({
      x: maisADireita + FLAPPY.pipeSpacing,
      gapY: nextGap(),
      passed: false,
    });
  }

  const dead = pipes.some((p) => hitsPipe(birdY, p));

  return { birdY, velocity, pipes, score, dead };
}
