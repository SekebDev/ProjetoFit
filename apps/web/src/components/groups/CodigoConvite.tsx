"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

/** Quanto tempo o "copiado!" fica na tela antes de voltar ao normal. */
const CONFIRMA_MS = 2000;

/**
 * O codigo de convite do grupo, com botao de copiar.
 *
 * Aparece pra qualquer membro, nao so pro dono: convidar gente e coisa de
 * quem participa. Quem nao e membro nem chega nesta tela — a rota devolve 404.
 */
export function CodigoConvite({ code }: { code: string }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const id = setTimeout(() => setCopiado(false), CONFIRMA_MS);
    return () => clearTimeout(id);
  }, [copiado]);

  async function copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      setCopiado(true);
    } catch {
      // clipboard exige contexto seguro (https ou localhost) e pode ser negada
      // pelo usuario. Nao ha o que consertar aqui: o codigo esta na tela em
      // fonte mono e espacado justamente pra poder ser copiado na mao.
    }
  }

  return (
    <section className="rounded-xl border bg-[var(--surface)] p-4">
      <p className="font-[family-name:var(--font-mono-face)] text-[11px] uppercase tracking-widest text-[var(--muted-2)]">
        Código de convite
      </p>

      <div className="mt-2 flex items-center gap-3">
        <code className="font-[family-name:var(--font-mono-face)] text-2xl font-bold tracking-[0.25em] text-[var(--chalk)]">
          {code}
        </code>

        <button
          type="button"
          onClick={() => void copiar()}
          className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
        >
          {copiado ? (
            <Check size={16} strokeWidth={2.5} aria-hidden />
          ) : (
            <Copy size={16} strokeWidth={2.5} aria-hidden />
          )}
          {copiado ? "Copiado!" : "Copiar"}
        </button>
      </div>

      <p className="mt-2 text-sm text-[var(--muted)]">
        Quem tiver esse código entra no grupo.
      </p>

      {/* O role=status vive fora do botao: anunciar a mudanca de rotulo do
          proprio botao faria o leitor de tela repetir "Copiar" a cada foco. */}
      <p role="status" className="sr-only">
        {copiado ? "Código copiado para a área de transferência." : ""}
      </p>
    </section>
  );
}
