"use client";

import type { Profile } from "@workout/shared";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useGeneratePlan } from "@/lib/hooks/useAi";

const MAX_NOTES = 500;

const OBJETIVOS: Record<Profile["goal"], string> = {
  FAT_LOSS: "perder gordura",
  HYPERTROPHY: "hipertrofia",
  STRENGTH: "força",
  GENERAL: "condicionamento geral",
};

const EXPERIENCIAS: Record<Profile["experience"], string> = {
  BEGINNER: "iniciante",
  RETURNING: "voltando a treinar",
  INTERMEDIATE: "intermediário",
  ADVANCED: "avançado",
};

/**
 * Traduz o erro da API pro que o usuario pode FAZER a respeito.
 *
 * Cada status tem uma saida diferente, e por isso o ApiError carrega o status e
 * nao so a mensagem: "a chave nao esta configurada" e "voce gerou 5 planos nesta
 * hora" pedem acoes opostas, e um "algo deu errado" nao ajudaria em nenhum dos
 * dois casos.
 */
function mensagemDoErro(erro: unknown): string {
  if (!(erro instanceof ApiError)) {
    return "Não deu pra falar com o servidor. Tente de novo.";
  }
  switch (erro.status) {
    case 503:
      return "A geração por IA não está configurada neste servidor. Você ainda pode montar um plano manualmente.";
    case 429:
      return "Você atingiu o limite de gerações desta hora. Tente mais tarde ou monte um plano manualmente.";
    case 404:
      return "Preencha seu perfil de treino antes de gerar um plano.";
    case 502:
      return "A IA não conseguiu montar um plano válido desta vez. Tente de novo.";
    default:
      return erro.message;
  }
}

export function AIPlanForm({ profile }: { profile: Profile }) {
  const [notes, setNotes] = useState("");
  const gerar = useGeneratePlan();
  const router = useRouter();

  function envia(e: React.FormEvent): void {
    e.preventDefault();
    gerar.mutate(
      { notes: notes.trim() || null },
      // Vai direto pro plano gerado: a graca de gerar e ver o resultado, nao
      // voltar pra uma lista e procurar qual dos planos e o novo.
      { onSuccess: (plan) => router.push(`/plans/${plan.id}`) },
    );
  }

  return (
    <form onSubmit={envia}>
      <section className="rounded-xl border bg-[var(--surface)] p-4">
        <h2 className="font-[family-name:var(--font-display-face)] font-bold">
          O que a IA vai considerar
        </h2>
        {/* Mostrar o que sera enviado antes de enviar: sem isto o usuario nao
            teria como saber que o plano saiu ruim porque o perfil esta velho. */}
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Item rotulo="Objetivo" valor={OBJETIVOS[profile.goal]} />
          <Item rotulo="Nível" valor={EXPERIENCIAS[profile.experience]} />
          <Item rotulo="Dias por semana" valor={String(profile.daysPerWeek)} />
          <Item
            rotulo="Equipamento"
            valor={
              profile.equipment.length === 0
                ? "tudo"
                : profile.equipment.length === 1
                  ? "1 tipo"
                  : `${profile.equipment.length} tipos`
            }
          />
          {profile.injuries ? (
            <div className="col-span-2">
              <dt className="font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-wider text-[var(--muted-2)]">
                Lesões
              </dt>
              <dd className="text-[var(--text)]">{profile.injuries}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <div className="mt-4">
        <label
          htmlFor="pedido"
          className="mb-1 block font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-wider text-[var(--muted-2)]"
        >
          Algum pedido? (opcional)
        </label>
        <textarea
          id="pedido"
          rows={3}
          maxLength={MAX_NOTES}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex.: quero focar em ombro este mês"
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--muted-2)]"
        />
      </div>

      <button
        type="submit"
        disabled={gerar.isPending}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--chalk)] px-5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Sparkles size={16} aria-hidden />
        {gerar.isPending ? "Montando seu plano..." : "Gerar plano"}
      </button>

      {gerar.isPending ? (
        <p
          aria-live="polite"
          className="mt-2 text-center text-xs text-[var(--muted-2)]"
        >
          Isso leva alguns segundos.
        </p>
      ) : null}

      {gerar.isError ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-[var(--m-chest)]/40 bg-[var(--m-chest)]/10 p-3 text-sm text-[var(--m-chest)]"
        >
          {mensagemDoErro(gerar.error)}
        </p>
      ) : null}
    </form>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-wider text-[var(--muted-2)]">
        {rotulo}
      </dt>
      <dd className="text-[var(--text)]">{valor}</dd>
    </div>
  );
}
