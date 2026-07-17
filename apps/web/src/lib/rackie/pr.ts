import type { LastLoad } from "@workout/shared";

/**
 * Decide se a serie recem-registrada bateu um recorde pessoal, comparando com a
 * ultima carga daquele exercicio (de um treino ja encerrado).
 *
 * Regra: e PR se o peso subiu, ou se o peso empatou mas fez mais reps. Sem
 * `lastLoad` (primeira vez no exercicio) nao ha com o que comparar, entao nao
 * enquadramos como PR — estreia nao e recorde.
 */
export function isPersonalRecord(
  weightKg: number | null,
  reps: number | null,
  lastLoad: LastLoad | undefined,
): boolean {
  if (!lastLoad) return false;
  if (weightKg === null) return false;

  const pesoAntes = lastLoad.weightKg;
  if (pesoAntes === null) return false;

  if (weightKg > pesoAntes) return true;
  // Peso igual: so conta como PR se cravou mais repeticoes.
  if (weightKg === pesoAntes && reps !== null && lastLoad.reps !== null) {
    return reps > lastLoad.reps;
  }
  return false;
}
