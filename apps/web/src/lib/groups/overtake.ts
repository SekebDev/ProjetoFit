import type { LeaderboardEntry } from "@workout/shared";

/**
 * Quem passou na sua frente desde a ultima vez que voce abriu o ranking.
 *
 * Nao existe notificacao de verdade aqui: nenhum servidor avisa nada. O que o
 * app faz e guardar a ordem que voce VIU e comparar com a ordem de agora. Isso
 * e de proposito — uma notificacao real exigiria push, permissao do navegador e
 * um servico de entrega, e o aviso so importa quando voce abre a tela mesmo.
 *
 * Consequencia honesta: o estado e por dispositivo. Ver no celular e depois no
 * computador mostra o aviso duas vezes. Aceitavel pro que a coisa e.
 */

const PREFIXO = "wk_lb";

/** Uma ordem por combinacao de grupo+periodo+metrica: sao rankings diferentes. */
export function chaveDaOrdem(
  groupId: string,
  period: string,
  metric: string,
): string {
  return `${PREFIXO}_${groupId}_${period}_${metric}`;
}

/**
 * A ordem guardada, ou null se nunca houve.
 *
 * Tudo dentro de try/catch: localStorage lanca em navegacao privada de alguns
 * navegadores e quando o usuario bloqueia armazenamento. Um ranking que quebra
 * porque o enfeite falhou seria um pessimo negocio.
 */
export function leOrdem(chave: string): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = window.localStorage.getItem(chave);
    if (!bruto) return null;
    const valor: unknown = JSON.parse(bruto);
    if (!Array.isArray(valor)) return null;
    return valor.filter((v): v is string => typeof v === "string");
  } catch {
    return null;
  }
}

export function gravaOrdem(chave: string, userIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(chave, JSON.stringify(userIds));
  } catch {
    // Cota estourada ou armazenamento bloqueado: o aviso simplesmente nao
    // aparece na proxima visita. Nada mais depende disso.
  }
}

/**
 * Os nomes de quem estava ABAIXO de voce e agora esta ACIMA.
 *
 * Compara posicao na lista, nao a posicao numerica do ranking: dois empatados
 * dividem o mesmo `position` e ninguem ultrapassou ninguem ali.
 *
 * Devolve vazio quando nao da pra afirmar que houve ultrapassagem:
 * - primeira visita (sem ordem anterior) — nao havia com o que comparar;
 * - voce nao estava no ranking antes, ou nao esta agora;
 * - quem esta na sua frente nao aparecia na ordem anterior (entrou no grupo
 *   depois). Essa pessoa nao te passou, ela chegou — cobrar ultrapassagem de
 *   quem acabou de entrar seria mentira.
 */
export function quemUltrapassou(
  anterior: string[] | null,
  atual: readonly LeaderboardEntry[],
  meuUserId: string,
): string[] {
  if (!anterior) return [];

  const euAntes = anterior.indexOf(meuUserId);
  if (euAntes === -1) return [];

  const euAgora = atual.findIndex((e) => e.userId === meuUserId);
  if (euAgora === -1) return [];

  return atual
    .slice(0, euAgora)
    .filter((e) => {
      const antes = anterior.indexOf(e.userId);
      return antes !== -1 && antes > euAntes;
    })
    .map((e) => e.name);
}

/** A ordem a guardar depois de renderizar: so os ids, na ordem exibida. */
export function ordemAtual(atual: readonly LeaderboardEntry[]): string[] {
  return atual.map((e) => e.userId);
}
