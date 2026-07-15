"use client";

import {
  MAX_BODY_FAT,
  MAX_BODY_WEIGHT_KG,
  MIN_BODY_FAT,
  MIN_BODY_WEIGHT_KG,
} from "@workout/shared";
import { useState } from "react";
import { useCreateMetric } from "@/lib/hooks/useMetrics";

/** "82,5" e "82.5" viram 82.5; vazio vira null. */
function paraNumero(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  if (limpo === "") return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

const CAMPO =
  "min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--muted-2)]";

export function WeightForm() {
  const [peso, setPeso] = useState("");
  const [gordura, setGordura] = useState("");
  const criar = useCreateMetric();

  const weightKg = paraNumero(peso);
  const bodyFat = paraNumero(gordura);
  // O botao so libera com peso valido: gordura e opcional, mas registrar uma
  // pesagem sem peso nao faz sentido nenhum.
  const valido =
    weightKg !== null &&
    weightKg >= MIN_BODY_WEIGHT_KG &&
    weightKg <= MAX_BODY_WEIGHT_KG &&
    (bodyFat === null || (bodyFat >= MIN_BODY_FAT && bodyFat <= MAX_BODY_FAT));

  function registra(e: React.FormEvent): void {
    e.preventDefault();
    if (!valido) return;
    criar.mutate(
      { weightKg, bodyFat, notes: null },
      {
        onSuccess: () => {
          setPeso("");
          setGordura("");
        },
      },
    );
  }

  return (
    <form onSubmit={registra} className="flex flex-wrap items-end gap-2">
      <div className="min-w-24 flex-1">
        <label
          htmlFor="peso"
          className="mb-1 block font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-wider text-[var(--muted-2)]"
        >
          Peso (kg)
        </label>
        <input
          id="peso"
          // decimal, nao number: no celular abre o teclado numerico com virgula
          // e nao vem com as setinhas de incremento que ninguem usa.
          inputMode="decimal"
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
          placeholder="82,5"
          className={CAMPO}
        />
      </div>

      <div className="min-w-24 flex-1">
        <label
          htmlFor="gordura"
          className="mb-1 block font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-wider text-[var(--muted-2)]"
        >
          Gordura (%)
        </label>
        <input
          id="gordura"
          inputMode="decimal"
          value={gordura}
          onChange={(e) => setGordura(e.target.value)}
          placeholder="opcional"
          className={CAMPO}
        />
      </div>

      <button
        type="submit"
        disabled={!valido || criar.isPending}
        className="min-h-11 shrink-0 rounded-md bg-[var(--chalk)] px-4 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {criar.isPending ? "Salvando..." : "Registrar"}
      </button>

      {criar.isError ? (
        <p role="alert" className="w-full text-xs text-[var(--m-chest)]">
          Não deu pra salvar. Tente de novo.
        </p>
      ) : null}
    </form>
  );
}
