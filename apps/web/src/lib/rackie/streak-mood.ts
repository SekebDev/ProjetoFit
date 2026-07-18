import type { Streak } from "@workout/shared";
import type { MascotState } from "@/components/Mascot";

/**
 * Traduz a sequencia na reacao da Rackie no painel: qual pose ela faz e o que
 * ela fala. E aqui que a gamificacao ganha cara — cada estado tem um humor.
 *
 * A frase e escolhida de forma DETERMINISTICA (indexada pela sequencia), nao
 * sorteada: Math.random no render quebra a regra react-hooks/purity, e assim a
 * fala tambem muda naturalmente conforme o numero sobe.
 */

export interface RackieMood {
  pose: MascotState;
  phrase: string;
}

/** Pools por estado. `n` e a sequencia atual, ja interpolada. */
const FALAS: Record<Streak["state"], (n: number) => string[]> = {
  // Sem agenda: nao da pra contar sequencia nenhuma.
  unscheduled: () => [
    "Agenda teus dias de treino que eu começo a contar tua sequência.",
    "Sem dias marcados eu não tenho o que contar, frango. Bora agendar.",
  ],
  // Sequencia zerada: dormindo, esperando comecar.
  idle: () => [
    "Sequência zerada. Bora começar hoje, frango.",
    "Tô aqui dormindo esperando você treinar. Começa uma sequência!",
    "Zero na conta. Todo monstro começou do zero também.",
  ],
  // Em risco: falta cumprir o dia agendado.
  atRisk: (n) => [
    `Tua sequência de ${n} tá por um fio. Não me decepciona.`,
    `Falta o treino pra segurar esses ${n}. Levanta daí!`,
    `${n} na conta e você quase jogando fora. Vai encarar?`,
  ],
  // Folga com a sequencia salva: ela protege a recuperacao.
  resting: (n) => [
    `${n} na conta. Hoje é descanso — recupera essas perna.`,
    `Folga merecida. Tua sequência de ${n} tá salva.`,
    `Descanso também é treino. Os ${n} continuam de pé.`,
  ],
  // Dia cumprido: comemora.
  active: (n) => [
    `${n} dias na sequência! Tá voando, monstro.`,
    `Mais um na conta: ${n} seguidos. Cadê o frango de ontem?`,
    `${n} em sequência. Tô te achando perigoso.`,
  ],
};

const POSES: Record<Streak["state"], MascotState> = {
  unscheduled: "idle",
  idle: "sleep",
  atRisk: "sad",
  resting: "rest",
  active: "cheer",
};

export function moodForStreak(streak: Streak): RackieMood {
  const pool = FALAS[streak.state](streak.current);
  // Indexar pela sequencia varia a fala conforme ela cresce, sem sortear.
  const phrase = pool[streak.current % pool.length];
  return { pose: POSES[streak.state], phrase };
}
