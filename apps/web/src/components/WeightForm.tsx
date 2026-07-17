"use client";

import {
  MAX_BODY_FAT,
  MAX_BODY_WEIGHT_KG,
  MIN_BODY_FAT,
  MIN_BODY_WEIGHT_KG,
} from "@workout/shared";
import { useState } from "react";
import { CampoNumero } from "@/components/CampoNumero";
import { useCreateMetric } from "@/lib/hooks/useMetrics";
import { numOrNull } from "@/lib/utils";

/**
 * Registro rapido de peso, em /progress.
 *
 * So peso e gordura de proposito: quem esta olhando o grafico quer anotar a
 * pesagem do dia em dois toques. A composicao inteira (massa magra, fita
 * metrica) mora no BodyCompositionForm, na secao avancada do perfil — mesmo
 * BodyMetric, ritmo diferente: a balanca e diaria, a fita nao.
 */
export function WeightForm() {
  const [peso, setPeso] = useState("");
  const [gordura, setGordura] = useState("");
  const criar = useCreateMetric();

  const weightKg = numOrNull(peso);
  const bodyFat = numOrNull(gordura);
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
      {
        weightKg,
        bodyFat,
        // Nulos explicitos: este form nao mede fita. Nao sao "esqueci", sao
        // "nao medi hoje" — e o schema exige todo campo presente.
        leanMassKg: null,
        waistCm: null,
        armCm: null,
        chestCm: null,
        thighCm: null,
        notes: null,
      },
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
        <CampoNumero
          id="peso"
          label="Peso"
          unidade="kg"
          value={peso}
          onChange={setPeso}
          placeholder="82,5"
        />
      </div>

      <div className="min-w-24 flex-1">
        <CampoNumero
          id="gordura"
          label="Gordura"
          unidade="%"
          value={gordura}
          onChange={setGordura}
          placeholder="opcional"
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
