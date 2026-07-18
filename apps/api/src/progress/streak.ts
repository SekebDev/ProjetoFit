import type { Streak, StreakState } from "@workout/shared";

/**
 * Calcula a sequencia de dias de treino AGENDADOS cumpridos, com reposicao.
 *
 * Regra (definida com o usuario): cada dia agendado precisa de um treino nesse
 * dia; se faltar, ainda conta se voce treinar num dia de FOLGA antes do proximo
 * dia agendado (repoe). Ex.: agenda seg/ter/qua/sex, faltou quarta mas treinou
 * quinta -> quarta reposta, sequencia intacta.
 *
 * Tudo puro e deterministico: recebe as datas ja no fuso do usuario (YYYY-MM-DD)
 * e nao toca em relogio nem em banco. Datas nesse formato comparam e ordenam
 * como string, entao a matematica de calendario fica simples.
 */

const JANELA_DIAS = 400;

export interface StreakInput {
  /** Hoje no fuso do usuario, YYYY-MM-DD. */
  today: string;
  /** Dias (YYYY-MM-DD) em que houve treino encerrado, no fuso do usuario. */
  trainedDates: readonly string[];
  /** Dias da semana agendados (ISO 1=segunda .. 7=domingo) do plano ativo. */
  scheduleWeekdays: readonly number[];
}

/** ISO weekday (1=segunda .. 7=domingo) de uma data YYYY-MM-DD. */
function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  // UTC de proposito: a data ja e um dia de calendario no fuso do usuario, e o
  // getUTCDay nao sofre deslocamento do fuso do servidor.
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=domingo
  return dow === 0 ? 7 : dow;
}

/** Soma dias a uma data YYYY-MM-DD, devolvendo YYYY-MM-DD. */
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function computeStreak(input: StreakInput): Streak {
  const { today, trainedDates, scheduleWeekdays } = input;
  const trained = new Set(trainedDates);
  const schedule = new Set(scheduleWeekdays);

  const scheduledToday = schedule.has(isoWeekday(today));
  const trainedToday = trained.has(today);

  if (schedule.size === 0) {
    return {
      current: 0,
      best: 0,
      state: "unscheduled",
      scheduledToday,
      trainedToday,
    };
  }

  // Datas agendadas <= hoje, da mais recente pra mais antiga.
  const limite = addDays(today, -JANELA_DIAS);
  const scheduled: string[] = [];
  for (let d = today; d >= limite; d = addDays(d, -1)) {
    if (schedule.has(isoWeekday(d))) scheduled.push(d);
  }

  // Um treino em dia de folga entre `after` (exclusivo) e `upper` repoe o dia
  // agendado anterior. Entre dois dias agendados consecutivos so ha folgas,
  // entao qualquer treino no intervalo serve de reposicao.
  const reposto = (
    after: string,
    upper: string,
    inclusive: boolean,
  ): boolean => {
    for (
      let d = addDays(after, 1);
      inclusive ? d <= upper : d < upper;
      d = addDays(d, 1)
    ) {
      if (trained.has(d)) return true;
    }
    return false;
  };

  const cumprido = (i: number): boolean => {
    const dia = scheduled[i];
    if (trained.has(dia)) return true;
    // Janela de reposicao: ate hoje (inclusive) pro mais recente; ate o proximo
    // dia agendado (exclusivo) pros anteriores.
    const upper = i === 0 ? today : scheduled[i - 1];
    return reposto(dia, upper, i === 0);
  };

  let run = 0;
  let best = 0;
  let current = 0;
  let currentDone = false;
  // Dia agendado mais recente ainda em aberto (janela de reposicao nao fechou).
  let pendente = false;

  for (let i = 0; i < scheduled.length; i++) {
    const feito = cumprido(i);
    if (i === 0 && !feito) {
      // O mais recente ainda pode ser reposto hoje/depois: nao conta nem quebra.
      pendente = true;
      continue;
    }
    if (feito) {
      run += 1;
      best = Math.max(best, run);
      if (!currentDone) current = run;
    } else {
      currentDone = true;
      run = 0;
    }
  }

  const state = decideState({
    current,
    pendente,
    scheduledToday,
    trainedToday,
  });

  return { current, best, state, scheduledToday, trainedToday };
}

function decideState(args: {
  current: number;
  pendente: boolean;
  scheduledToday: boolean;
  trainedToday: boolean;
}): StreakState {
  const { current, pendente, scheduledToday, trainedToday } = args;

  if (current === 0) return "idle";
  // Tem sequencia mas o dia agendado mais recente segue em aberto: em risco.
  if (pendente) return "atRisk";
  // Sequencia viva e o dia mais recente cumprido. Se hoje e dia de treino e ja
  // treinou -> comemora; se hoje e folga -> descanso merecido.
  if (scheduledToday && trainedToday) return "active";
  if (!scheduledToday) return "resting";
  return "active";
}
