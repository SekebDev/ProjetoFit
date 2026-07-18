/**
 * A economia de XP: quanto vale um treino e como isso vira nivel.
 *
 * Funcoes puras de proposito — o GameService busca os numeros no banco e
 * delega. Assim a regra que decide recompensa e testavel sem subir Postgres.
 */

/** Pago so por concluir o treino. Aparecer ja conta. */
const XP_BASE = 50;
const XP_POR_SERIE = 5;
const XP_POR_PR = 25;

/**
 * A sequencia multiplica o XP: +2% por dia, teto de +50%.
 *
 * O teto existe pra sequencia longa nao transformar cada treino num evento de
 * XP desproporcional — quem esta ha 100 dias na chama nao pode ganhar 3x o que
 * ganha quem esta comecando pelo mesmo esforco.
 */
const BONUS_POR_DIA = 0.02;
const BONUS_MAX = 0.5;

/** Cada nivel custa este tanto vezes o quadrado da distancia ate o nivel 1. */
const XP_POR_NIVEL = 100;

export interface SessionXpInput {
  /** Series efetivamente completadas na sessao. */
  setCount: number;
  /** Recordes pessoais batidos na sessao. */
  prCount: number;
  /** Sequencia atual no momento em que o treino foi fechado. */
  streak: number;
}

/**
 * XP que uma sessao paga.
 *
 * O multiplicador entra por ultimo, sobre a base inteira — entao a sequencia
 * valoriza tambem o volume e os PRs daquele treino, nao so o comparecimento.
 */
export function computeSessionXp(input: SessionXpInput): number {
  const base =
    XP_BASE + XP_POR_SERIE * input.setCount + XP_POR_PR * input.prCount;

  return Math.round(base * (1 + streakBonusFor(input.streak)));
}

/**
 * O bonus que a sequencia concede, de 0 a 0.5.
 *
 * Exportado porque a UI mostra o multiplicador ("x1,2") junto do XP ganho — e
 * ela precisa do mesmo numero que entrou na conta, nao de uma reimplementacao.
 *
 * Math.max(0, ...): sequencia nunca desconta XP. Nao deveria chegar negativa
 * aqui, mas se chegar o pior caso e nao ganhar bonus — nunca perder progresso.
 */
export function streakBonusFor(streak: number): number {
  return Math.min(BONUS_MAX, BONUS_POR_DIA * Math.max(0, streak));
}

/** Nivel correspondente a um total de XP. Cresce em raiz: cada nivel custa mais. */
export function levelFor(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / XP_POR_NIVEL)) + 1;
}

/** XP minimo pra estar num nivel — o inverso exato de `levelFor`. */
export function xpForLevel(level: number): number {
  const distancia = Math.max(0, level - 1);
  return distancia * distancia * XP_POR_NIVEL;
}
