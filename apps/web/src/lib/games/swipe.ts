// Resolve a direção de um arrasto (swipe) para o Snake. Puro e sem DOM: o
// componente coleta os deltas do ponteiro (toque ou mouse) e delega a decisão
// aqui, igual os outros motores (snake.ts/flappy.ts) — assim o mapeamento é
// testável sem tocar em canvas nem em evento de toque.

import type { Dir } from "./snake";

/** Limiar padrão (px) pra um gesto contar como intenção de virar. */
export const SWIPE_LIMIAR = 24;

/**
 * Converte o deslocamento de um arrasto (dx, dy em px) na direção
 * correspondente. O eixo dominante vence; empate exato resolve na horizontal
 * (arbitrário, mas estável). Abaixo do `limiar` devolve null — evita virar sem
 * intenção num toque parado ou num tremor de dedo.
 *
 * Eixo do DOM: y cresce pra baixo, então dy > 0 é DOWN.
 */
export function swipeDir(
  dx: number,
  dy: number,
  limiar: number = SWIPE_LIMIAR,
): Dir | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < limiar && ay < limiar) return null;
  if (ax >= ay) return dx > 0 ? "RIGHT" : "LEFT";
  return dy > 0 ? "DOWN" : "UP";
}
