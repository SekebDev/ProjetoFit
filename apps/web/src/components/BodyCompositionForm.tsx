"use client";

import {
  COMPOSITION_FIELDS,
  COMPOSITION_RANGES,
  MAX_BODY_FAT,
  MAX_BODY_WEIGHT_KG,
  MIN_BODY_FAT,
  MIN_BODY_WEIGHT_KG,
  type BodyMetric,
  type CreateMetricInput,
} from "@workout/shared";
import { useState } from "react";
import { CampoNumero } from "@/components/CampoNumero";
import { useCreateMetric, useMetrics } from "@/lib/hooks/useMetrics";
import { numOrNull } from "@/lib/utils";

/** Campos numericos que o form edita — o `notes` fica de fora. */
const CAMPOS = [
  { key: "weightKg" as const, label: "Peso", unidade: "kg" },
  ...COMPOSITION_FIELDS,
];

type Chave = (typeof CAMPOS)[number]["key"];

const VAZIO: Record<Chave, string> = {
  weightKg: "",
  bodyFat: "",
  leanMassKg: "",
  waistCm: "",
  armCm: "",
  chestCm: "",
  thighCm: "",
};

const LIMITES: Record<Chave, { min: number; max: number }> = {
  weightKg: { min: MIN_BODY_WEIGHT_KG, max: MAX_BODY_WEIGHT_KG },
  bodyFat: { min: MIN_BODY_FAT, max: MAX_BODY_FAT },
  ...COMPOSITION_RANGES,
};

/**
 * O valor mais recente de UM campo, varrendo o historico.
 *
 * Nao basta olhar o registro mais novo: quem pesa toda semana mas passa a fita
 * uma vez por mes tem o ultimo registro so com peso. Cada medida tem seu proprio
 * "mais recente" — por isso a busca e por campo, nao por linha.
 */
function ultimoValor(
  metrics: BodyMetric[] | undefined,
  campo: Chave,
): number | null {
  // A API ja devolve do mais recente pro mais antigo.
  return metrics?.find((m) => m[campo] !== null)?.[campo] ?? null;
}

export function BodyCompositionForm() {
  const { data: metrics } = useMetrics();
  const [valores, setValores] = useState<Record<Chave, string>>(VAZIO);
  const criar = useCreateMetric();

  const numeros = Object.fromEntries(
    CAMPOS.map((c) => [c.key, numOrNull(valores[c.key])]),
  ) as Record<Chave, number | null>;

  const preenchidos = CAMPOS.filter((c) => valores[c.key].trim() !== "");
  const foraDeFaixa = preenchidos.filter((c) => {
    const n = numeros[c.key];
    return n === null || n < LIMITES[c.key].min || n > LIMITES[c.key].max;
  });
  const valido = preenchidos.length > 0 && foraDeFaixa.length === 0;

  function registra(e: React.FormEvent): void {
    e.preventDefault();
    if (!valido) return;
    const input: CreateMetricInput = { ...numeros, notes: null };
    criar.mutate(input, { onSuccess: () => setValores(VAZIO) });
  }

  return (
    <form onSubmit={registra}>
      <p className="mb-3 text-xs text-[var(--muted)]">
        Preencha só o que mediu hoje. O resto continua valendo do último
        registro.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CAMPOS.map((campo) => {
          const ultimo = ultimoValor(metrics, campo.key);
          return (
            <CampoNumero
              key={campo.key}
              id={`comp-${campo.key}`}
              label={campo.label}
              unidade={campo.unidade}
              value={valores[campo.key]}
              onChange={(v) =>
                setValores((atual) => ({ ...atual, [campo.key]: v }))
              }
              // O ultimo valor vira placeholder, nao valor inicial: preencher os
              // campos faria um "registrar" sem tocar em nada gravar a medida do
              // mes passado com a data de hoje — historico falso.
              placeholder={ultimo !== null ? ultimo.toLocaleString("pt-BR") : "—"}
            />
          );
        })}
      </div>

      {foraDeFaixa.length > 0 ? (
        <p role="alert" className="mt-3 text-xs text-[var(--m-chest)]">
          Confira {foraDeFaixa.map((c) => c.label.toLowerCase()).join(", ")}.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!valido || criar.isPending}
        className="mt-4 min-h-11 w-full rounded-md bg-[var(--chalk)] px-4 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto sm:px-6"
      >
        {criar.isPending ? "Salvando..." : "Registrar medidas"}
      </button>

      {criar.isError ? (
        <p role="alert" className="mt-2 text-xs text-[var(--m-chest)]">
          Não deu pra salvar. Tente de novo.
        </p>
      ) : null}
    </form>
  );
}
