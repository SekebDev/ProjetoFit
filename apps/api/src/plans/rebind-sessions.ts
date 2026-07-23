/**
 * Casamento entre os dias que o update do plano apaga e os que ele recria.
 *
 * Editar um plano e substituicao total (plans.service.update): os PlanDay sao
 * apagados e recriados com ids NOVOS. Quem estava no meio de um treino perde a
 * FK pro dia (onDelete: SetNull) e fica com uma sessao aberta sem prescricao —
 * que o painel nao consegue fechar por caminho nenhum. Re-apontar a sessao pro
 * dia recriado evita esse estado travado E deixa o treino continuar com a
 * prescricao atualizada, que e o motivo pelo qual a pessoa foi editar o plano.
 *
 * Os SetLog penduram na sessao, nao no dia, entao as series ja registradas
 * sobrevivem ao re-vinculo sem nenhum cuidado extra.
 */

/** O dia apagado, como estava antes da edicao. */
export interface DiaAntigo {
  id: string;
  name: string;
  order: number;
}

/** O dia recriado, ja com o id novo que o Prisma gerou. */
export interface DiaNovo {
  id: string;
  name: string;
  order: number;
}

/**
 * O id do dia recriado que corresponde ao antigo, ou null se ele nao sobreviveu
 * a edicao.
 *
 * Nome antes de order de proposito: inserir um dia no meio do plano desloca
 * todos os `order` (que saem do indice do array em buildDaysCreate), enquanto
 * "Push" continua sendo "Push". So que nome nao e unico — nada impede dois dias
 * "Push" no mesmo plano —, entao ele so decide quando e inequivoco. Com nome
 * repetido ou renomeado, o `order` desempata.
 *
 * Decide um dia por vez, entao dois dias antigos podem cair no mesmo dia novo
 * (dois "Push" que viraram um). O resultado sao duas sessoes abertas no mesmo
 * dia — situacao que o app ja tratava antes disto: o start e o activeSession
 * escolhem a mais recente com `date desc` justamente porque dois POST
 * simultaneos no READ COMMITTED tambem produzem esse par.
 */
export function resolveRebind(
  antigo: DiaAntigo,
  novos: readonly DiaNovo[],
): string | null {
  const porNome = novos.filter((d) => d.name === antigo.name);
  if (porNome.length === 1) {
    return porNome[0].id;
  }

  const porOrder = novos.find((d) => d.order === antigo.order);
  return porOrder?.id ?? null;
}
