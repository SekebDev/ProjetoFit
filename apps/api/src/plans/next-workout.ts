import type { PlanDay } from "@workout/shared";

/** So os campos que a escolha do proximo treino realmente usa. */
export type SchedulableDay = Pick<PlanDay, "id" | "name" | "focus" | "weekday">;

export interface NextChoice {
  day: SchedulableDay;
  /** true quando o dia escolhido e o agendado para hoje. */
  isToday: boolean;
}

/**
 * Distancia em dias de hoje (ISO 1..7) ate um weekday agendado: 0 (hoje) a 6.
 * `(weekday - hoje) mod 7`, sempre positiva.
 */
function distancia(weekday: number, todayWeekday: number): number {
  return (((weekday - todayWeekday) % 7) + 7) % 7;
}

/**
 * Escolhe o proximo dia de treino do plano a partir dos dias agendados.
 *
 * Regra: o dia agendado para hoje vence (isToday), a menos que ja tenha sido
 * treinado hoje — ai ele "anda uma semana" e a vez passa para o proximo dia
 * agendado mais proximo. Dias sem `weekday` nao entram no agendamento (o painel
 * cai no estado "nenhum treino agendado"). Empate de distancia: vence o de menor
 * `order`, e como a lista ja chega ordenada, basta o `<` estrito preservar o
 * primeiro.
 */
export function pickNextWorkout(
  days: SchedulableDay[],
  todayWeekday: number,
  finishedTodayIds: readonly string[],
): NextChoice | null {
  let best: SchedulableDay | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const day of days) {
    if (day.weekday === null) continue;
    let dist = distancia(day.weekday, todayWeekday);
    // Ja treinou esse dia hoje: a proxima ocorrencia so na semana que vem.
    if (dist === 0 && finishedTodayIds.includes(day.id)) dist = 7;
    if (dist < bestDist) {
      bestDist = dist;
      best = day;
    }
  }

  return best ? { day: best, isToday: bestDist === 0 } : null;
}
