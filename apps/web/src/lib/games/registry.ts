import { DOPAMINE_GAMES, type DopamineGame } from "@workout/shared";

/** Rotulo amigavel de cada jogo, pro seletor no perfil e pro cabecalho. */
export const GAME_LABELS: Record<DopamineGame, string> = {
  FLAPPY: "Flappy",
  SNAKE: "Snake",
};

/**
 * Escolhe qual jogo mostrar neste descanso a partir do que o usuario habilitou.
 * `enabled` vazio significa "qualquer um" (todos entram no sorteio). Ids
 * desconhecidos (schema antigo) sao ignorados. Devolve null quando, depois de
 * filtrar, nao sobra jogo valido — ai o descanso fica so com o cronometro.
 *
 * `rng` injetavel pra testar sem aleatorio.
 */
export function pickDopamineGame(
  enabled: readonly string[],
  rng: () => number = Math.random,
): DopamineGame | null {
  const validos = enabled.filter((g): g is DopamineGame =>
    (DOPAMINE_GAMES as readonly string[]).includes(g),
  );
  const pool = validos.length > 0 ? validos : [...DOPAMINE_GAMES];
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}
