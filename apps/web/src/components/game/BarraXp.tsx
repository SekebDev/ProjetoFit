"use client";

import { Trophy } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useGame } from "@/lib/hooks/useGame";

/**
 * Nivel e barra de XP do painel.
 *
 * A barra mede o progresso DENTRO do nivel atual, nao o XP total: o total so
 * cresce e a barra nunca voltaria pro comeco, que e justamente a satisfacao de
 * subir de nivel.
 */
export function BarraXp() {
  const { data, isLoading } = useGame();

  if (isLoading) {
    return (
      <div className="h-20 animate-pulse rounded-xl border bg-[var(--surface)]" />
    );
  }
  if (!data) return null;

  // Guarda contra divisao por zero: xpForNextLevel so seria 0 se a formula de
  // nivel mudasse pra algo degenerado, mas a barra nao pode virar NaN por isso.
  const pct =
    data.xpForNextLevel > 0
      ? Math.min(100, (data.xpIntoLevel / data.xpForNextLevel) * 100)
      : 0;
  const falta = Math.max(0, data.xpForNextLevel - data.xpIntoLevel);

  return (
    <section className="rounded-xl border bg-[var(--surface)] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-mono-face)] text-[11px] uppercase tracking-widest text-[var(--muted-2)]">
            Nível
          </span>
          <span className="font-[family-name:var(--font-display-face)] text-2xl font-bold tabular-nums leading-none">
            {data.level}
          </span>
        </div>

        <Link
          href="/achievements"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]"
        >
          <Trophy size={15} strokeWidth={2.5} aria-hidden />
          Conquistas
        </Link>
      </div>

      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]"
        role="progressbar"
        aria-valuenow={data.xpIntoLevel}
        aria-valuemin={0}
        aria-valuemax={data.xpForNextLevel}
        aria-label={`Progresso para o nível ${data.level + 1}`}
      >
        <motion.div
          className="h-full rounded-full bg-[var(--m-shoulders)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>

      <p className="mt-2 font-[family-name:var(--font-mono-face)] text-[11px] text-[var(--muted-2)]">
        {data.xpIntoLevel} / {data.xpForNextLevel} XP · faltam {falta} pro nível{" "}
        {data.level + 1}
      </p>
    </section>
  );
}
