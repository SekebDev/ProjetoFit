import { displayName, isAnonymous } from "./display-name";

/**
 * O numero de um membro numa metrica, antes de virar ranking.
 *
 * De proposito NAO carrega e-mail: o leaderboard e a unica tela onde um usuario
 * le dados de outro, e o tipo e o que garante que nao ha como vazar contato sem
 * querer. O que sai daqui e o que o grupo inteiro pode ver.
 */
export interface MemberScore {
  userId: string;
  /** null quando o usuario nunca preencheu o nome. */
  name: string | null;
  /** Ja na unidade da metrica escolhida (XP, treinos, kg, dias). */
  value: number;
}

export interface RankedMember {
  userId: string;
  /** Sempre preenchido — `null` vira "Anônimo". */
  name: string;
  value: number;
  /** 1-based. Empatados dividem a mesma posicao. */
  position: number;
  /** Quanto falta pra alcancar o primeiro colocado. 0 pra quem lidera. */
  behindLeader: number;
}

/**
 * Ordena os membros e atribui posicao.
 *
 * Ranking de competicao (1, 2, 2, 4): dois segundos lugares empurram o proximo
 * pro quarto. E o que as pessoas esperam de um placar — dizer "terceiro" pra
 * quem tem duas pessoas na frente soaria errado.
 *
 * Puro: o service busca os numeros de cada metrica e delega a ordenacao aqui,
 * entao a regra do empate e testavel sem subir Postgres.
 */
export function rankMembers(scores: readonly MemberScore[]): RankedMember[] {
  // Copia antes de ordenar: sort muta o array, e o chamador passou o dele.
  const ordenados = [...scores].sort(comparaScore);

  const lider = ordenados[0]?.value ?? 0;

  const ranked: RankedMember[] = [];
  for (const [indice, s] of ordenados.entries()) {
    const anterior = ranked[indice - 1];
    // Empatou com quem veio antes: herda a posicao. Senao, a posicao e o
    // proprio indice+1 — o que naturalmente pula os numeros consumidos pelo
    // empate.
    const position =
      anterior && anterior.value === s.value ? anterior.position : indice + 1;

    ranked.push({
      userId: s.userId,
      name: displayName(s.name),
      value: s.value,
      position,
      behindLeader: lider - s.value,
    });
  }
  return ranked;
}

/**
 * Maior valor primeiro; no empate, quem tem nome vem antes dos anonimos, e
 * entre iguais vale a ordem alfabetica.
 *
 * O desempate por nome nao e capricho: sem um criterio estavel, dois empatados
 * trocariam de lugar a cada requisicao conforme a ordem que o Postgres
 * devolvesse — e a UI ficaria piscando sozinha.
 *
 * Os anonimos precisam do teste explicito porque comparar o texto "Anônimo" nao
 * resolve: comecando com A, ele venceria alfabeticamente quase todo mundo e
 * quem nao preencheu o perfil subiria na frente de quem preencheu.
 */
function comparaScore(a: MemberScore, b: MemberScore): number {
  if (b.value !== a.value) return b.value - a.value;

  const anonimoA = isAnonymous(a.name);
  const anonimoB = isAnonymous(b.name);
  if (anonimoA !== anonimoB) return anonimoA ? 1 : -1;

  return displayName(a.name).localeCompare(displayName(b.name), "pt-BR");
}
