import { focusManager } from "@tanstack/react-query";

/**
 * Gancho global que o lado nativo do WebView Android chama no `Activity.onResume`
 * (via `evaluateJavascript`) pra sinalizar que o app voltou ao primeiro plano.
 */
interface JanelaComResume extends Window {
  __notifyAppResumed?: () => void;
}

/**
 * Faz o React Query revalidar quando o app volta ao primeiro plano.
 *
 * Por que existe: no WebView Android, trazer o app de volta nem sempre dispara o
 * `visibilitychange` que o React Query escuta por padrao — entao as queries
 * ativas ficam paradas ate um F5. Esta ponte:
 *
 * 1. Expoe `window.__notifyAppResumed()` pro lado nativo chamar no onResume.
 * 2. Reforca com `pageshow`, que cobre a restauracao via bfcache (voltar/avancar)
 *    — um caso em que `visibilitychange` nao dispara.
 *
 * O sinal de resume forca a revalidacao com um toggle `false -> true` no
 * `focusManager`: ele so notifica os observers quando o valor MUDA, entao repetir
 * `setFocused(true)` viraria no-op. O toggle garante que todo resume revalide as
 * queries ativas e vencidas (`staleTime`) — nenhum polling, so no retorno.
 *
 * Idempotente: chamar de novo remove a instalacao anterior antes de religar,
 * entao o StrictMode (efeito montado duas vezes) nao acumula listeners.
 *
 * @returns funcao de limpeza que desfaz a instalacao.
 */
export function installAppResumeBridge(win: Window = window): () => void {
  const janela = win as JanelaComResume;

  const revalidarNoResume = (): void => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  };

  janela.__notifyAppResumed = revalidarNoResume;
  win.addEventListener("pageshow", revalidarNoResume);

  return (): void => {
    win.removeEventListener("pageshow", revalidarNoResume);
    if (janela.__notifyAppResumed) delete janela.__notifyAppResumed;
  };
}
