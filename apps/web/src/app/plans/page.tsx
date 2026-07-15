"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { PlanSummary } from "@workout/shared";
import { Mascot } from "@/components/Mascot";
import { useAuth } from "@/lib/auth";
import { useActivatePlan, useDeletePlan, usePlans } from "@/lib/hooks/usePlans";
import { cn } from "@/lib/utils";

export default function PlansPage() {
  const { user, loading } = useAuth();
  const { data: plans, isLoading } = usePlans();

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-[family-name:var(--font-mono-face)] text-xs uppercase tracking-[0.25em] text-[var(--muted-2)]">
            Rotina
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display-face)] text-3xl font-bold tracking-tight">
            Planos
          </h1>
        </div>
        {user ? (
          <Link
            href="/plans/new"
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-md bg-[var(--chalk)] px-4 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden />
            Novo
          </Link>
        ) : null}
      </header>

      {loading || (user && isLoading) ? (
        <ul className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              className="h-24 animate-pulse rounded-xl border bg-[var(--surface)]"
            />
          ))}
        </ul>
      ) : !user ? (
        <SignedOut />
      ) : !plans || plans.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </ul>
      )}
    </main>
  );
}

function PlanCard({ plan }: { plan: PlanSummary }) {
  const activate = useActivatePlan();
  const remove = useDeletePlan();
  const [confirming, setConfirming] = useState(false);

  return (
    <li
      className={cn(
        "rounded-xl border bg-[var(--surface)] p-4 transition-colors",
        plan.isActive
          ? "border-[var(--m-legs)]"
          : "border-[var(--border)] hover:border-[var(--muted-2)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Link href={`/plans/${plan.id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-[family-name:var(--font-display-face)] text-lg font-bold">
              {plan.name}
            </h2>
            {plan.isActive ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--m-legs)]/15 px-2 py-0.5 font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-wider text-[var(--m-legs)]">
                <Check size={10} strokeWidth={3} aria-hidden />
                ativo
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted-2)]">
            {plan.dayCount} {plan.dayCount === 1 ? "dia" : "dias"} ·{" "}
            {plan.source === "AI" ? "gerado por IA" : "manual"}
          </p>
        </Link>

        <button
          type="button"
          aria-label={`Excluir ${plan.name}`}
          onClick={() => setConfirming((v) => !v)}
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-[var(--muted-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--m-chest)]"
        >
          <Trash2 size={16} aria-hidden />
        </button>
      </div>

      {confirming ? (
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <span className="mr-auto text-xs text-[var(--muted)]">
            Excluir este plano?
          </span>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="min-h-9 rounded-md px-3 text-xs text-[var(--muted)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => remove.mutate(plan.id)}
            className="min-h-9 rounded-md bg-[var(--m-chest)] px-3 text-xs font-semibold text-white disabled:opacity-50"
          >
            Excluir
          </button>
        </div>
      ) : !plan.isActive ? (
        <button
          type="button"
          disabled={activate.isPending}
          onClick={() => activate.mutate(plan.id)}
          className="mt-3 min-h-9 w-full rounded-md border text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--muted-2)] hover:text-[var(--text)] disabled:opacity-50"
        >
          {activate.isPending ? "Ativando..." : "Tornar ativo"}
        </button>
      ) : null}
    </li>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <Mascot state="idle" size="md" />
      <p className="text-sm text-[var(--muted)]">
        Nenhum plano ainda. Monte o primeiro.
      </p>
      <Link
        href="/plans/new"
        className="mt-1 flex min-h-11 items-center rounded-md bg-[var(--chalk)] px-5 text-sm font-semibold text-black"
      >
        Criar plano
      </Link>
    </div>
  );
}

function SignedOut() {
  return (
    <div className="rounded-xl border bg-[var(--surface)] p-8 text-center">
      <p className="text-[var(--muted)]">Entre para montar seus planos.</p>
      <Link
        href="/login"
        className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[var(--chalk)] px-5 text-sm font-semibold text-black"
      >
        Entrar
      </Link>
    </div>
  );
}
