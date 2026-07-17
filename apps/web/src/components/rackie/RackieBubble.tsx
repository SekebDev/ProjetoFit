"use client";

import { motion } from "motion/react";
import { Mascot, type MascotState } from "@/components/Mascot";

/** Estilos de entrada da Rackie — rotacionam pra dar variacao. */
export const ENTRADAS = ["jump", "zoom", "slide"] as const;
export type Entrada = (typeof ENTRADAS)[number];

/** De onde cada entrada parte; o alvo e sempre o centro assentado. */
const INICIAL: Record<Entrada, { y?: number; x?: number; scale: number }> = {
  jump: { y: 60, scale: 0.6 },
  zoom: { scale: 0.2 },
  slide: { x: -120, scale: 0.8 },
};

interface RackieBubbleProps {
  phrase: string;
  state: MascotState;
  entrada: Entrada;
  /**
   * Marcos (PR, fim de dia) sao anunciados por leitor de tela; a fala de cada
   * serie fica muda (aria-hidden) pra nao entupir o leitor a cada registro — o
   * progresso "feitas/prescritas" ja e a informacao acessivel de verdade.
   */
  announce: boolean;
}

/**
 * A Rackie saltando no meio da tela com um balao de fala acima da cabeca. O
 * confete (canvas-confetti) e disparado pelo provider por tras — aqui e so a
 * mascote e a mensagem. Entrada e saida com mola (motion); sem capturar clique
 * (pointer-events-none) pra nunca atrapalhar o registro por cima.
 */
export function RackieBubble({
  phrase,
  state,
  entrada,
  announce,
}: RackieBubbleProps) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4"
      {...(announce
        ? { role: "status" as const, "aria-live": "polite" as const }
        : { "aria-hidden": true })}
    >
      <motion.div
        className="flex max-w-xs flex-col items-center gap-2"
        initial={{ opacity: 0, x: 0, y: 0, ...INICIAL[entrada] }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8, y: 12 }}
        transition={{ type: "spring", stiffness: 480, damping: 22 }}
      >
        {/* Balao acima da cabeca, com o rabinho apontando pra baixo. */}
        <div className="relative rounded-2xl rounded-b-sm border border-[var(--chalk)]/20 bg-[var(--surface-2)] px-4 py-2 text-center shadow-xl">
          <span
            aria-hidden
            className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-b border-r border-[var(--chalk)]/20 bg-[var(--surface-2)]"
          />
          <p className="relative font-[family-name:var(--font-display-face)] text-base font-bold leading-snug text-[var(--text)]">
            {phrase}
          </p>
        </div>
        <Mascot state={state} size="lg" />
      </motion.div>
    </div>
  );
}
