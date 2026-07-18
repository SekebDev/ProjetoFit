import type { LastLoad } from "@workout/shared";

/**
 * Decide se a serie recem-registrada bateu um recorde pessoal.
 *
 * Compara com o RECORDE historico do exercicio (`bestWeightKg`/`bestReps`), nao
 * com a ultima carga: depois de uma semana de deload, "melhor que da ultima
 * vez" nao e recorde nenhum.
 *
 * Regra: e PR se a carga subiu, ou se empatou e fez mais repeticoes. Ela e a
 * MESMA que o servidor aplica ao apurar o XP (api game/game.service.ts, na
 * janela `prQuery`). Precisa continuar sendo: e o servidor quem paga os 25 XP e
 * conta pras conquistas de PR, entao qualquer divergencia faz a Rackie
 * comemorar um recorde que nao apareceu no placar.
 *
 * Sem recorde (primeira vez no exercicio) nao ha com o que comparar — estreia
 * nao e recorde.
 */
export function isPersonalRecord(
  weightKg: number | null,
  reps: number | null,
  lastLoad: LastLoad | undefined,
): boolean {
  if (!lastLoad) return false;
  if (weightKg === null) return false;

  const recorde = lastLoad.bestWeightKg;
  if (recorde === null) return false;

  if (weightKg > recorde) return true;
  // Carga igual: so conta como PR se cravou mais repeticoes.
  if (weightKg === recorde && reps !== null && lastLoad.bestReps !== null) {
    return reps > lastLoad.bestReps;
  }
  return false;
}
