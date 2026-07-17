import type { Deload, WeeklyVolume } from "@workout/shared";

/** Quantas semanas TREINADAS entram na media de base. */
export const DELOAD_BASELINE_WEEKS = 4;
/** Queda >= 15% do volume vs. a base dispara o gatilho de fadiga. */
export const DELOAD_DROP_THRESHOLD = 0.15;
/** Semana com volume >= 85% da base conta como "pesada". */
export const DELOAD_HARD_WEEK_RATIO = 0.85;
/** Semanas pesadas seguidas a partir das quais o ciclo pede deload. */
export const DELOAD_CYCLE_WEEKS = 5;
/** Minimo de semanas completas pra arriscar uma sugestao. */
const MIN_WEEKS_PARA_OPINAR = 2;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const VAZIO: Deload = {
  recommend: false,
  reason: null,
  lastWeekVolume: null,
  baselineVolume: null,
  dropPct: null,
  hardWeekStreak: 0,
};

/**
 * Decide se vale sugerir um deload, combinando fadiga (volume caindo) e ciclo
 * (muitas semanas pesadas seguidas).
 *
 * @param weeks Volume por semana, em ordem CRESCENTE de data (como o weeklyVolume).
 * @param currentWeekStartISO Inicio da semana corrente, no fuso do usuario.
 */
export function computeDeload(
  weeks: WeeklyVolume[],
  currentWeekStartISO: string,
): Deload {
  const current = Date.parse(currentWeekStartISO);

  // So semanas COMPLETAS: comparar a semana em andamento (parcial) com semanas
  // inteiras acusaria "queda" todo comeco de semana.
  const completed = weeks.filter((w) => Date.parse(w.weekStart) < current);
  if (completed.length < MIN_WEEKS_PARA_OPINAR) return VAZIO;

  // Densifica: semanas sem treino nao vem na query, mas precisam virar 0 pra um
  // descanso quebrar a contagem de "semanas pesadas seguidas".
  const first = Date.parse(completed[0].weekStart);
  const last = Date.parse(completed[completed.length - 1].weekStart);
  const volByWeek = new Map<number, number>(
    completed.map((w) => [Date.parse(w.weekStart), w.volume]),
  );
  const dense: number[] = [];
  for (let t = first; t <= last; t += WEEK_MS) {
    dense.push(volByWeek.get(t) ?? 0);
  }

  const lastWeekVolume = dense[dense.length - 1];

  // Base: media das ultimas semanas TREINADAS antes da ultima. Exclui a ultima
  // (e o alvo da comparacao) e as semanas de descanso (senao a base afundaria).
  const priorTrained = dense
    .slice(0, -1)
    .filter((v) => v > 0)
    .slice(-DELOAD_BASELINE_WEEKS);
  const baselineVolume =
    priorTrained.length > 0
      ? priorTrained.reduce((a, b) => a + b, 0) / priorTrained.length
      : null;

  const hasBase = baselineVolume !== null && baselineVolume > 0;

  // Fadiga: treinou na ultima semana, mas o volume caiu abaixo do limiar.
  const dropPct = hasBase
    ? (baselineVolume - lastWeekVolume) / baselineVolume
    : null;
  const fatigue =
    lastWeekVolume > 0 && dropPct !== null && dropPct >= DELOAD_DROP_THRESHOLD;

  // Ciclo: quantas semanas pesadas (>= ratio da base) seguidas terminam na
  // ultima. Uma semana leve ou de descanso zera a contagem.
  let hardWeekStreak = 0;
  if (hasBase) {
    const limiar = baselineVolume * DELOAD_HARD_WEEK_RATIO;
    for (let i = dense.length - 1; i >= 0 && dense[i] >= limiar; i--) {
      hardWeekStreak++;
    }
  }
  const cycle = hardWeekStreak >= DELOAD_CYCLE_WEEKS;

  const reason =
    fatigue && cycle
      ? "BOTH"
      : fatigue
        ? "FATIGUE"
        : cycle
          ? "CYCLE"
          : null;

  return {
    recommend: fatigue || cycle,
    reason,
    lastWeekVolume,
    baselineVolume,
    dropPct,
    hardWeekStreak,
  };
}
