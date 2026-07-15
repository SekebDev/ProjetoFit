"use client";

import { ArrowLeft, Check, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { Plan } from "@workout/shared";
import { PlanEditor } from "@/components/PlanEditor";
import { useActivatePlan, usePlan, useUpdatePlan } from "@/lib/hooks/usePlans";
import { MUSCLE_META } from "@/lib/meta";

export default function PlanDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: plan, isLoading, isError } = usePlan(params.id);
  const update = useUpdatePlan(params.id);
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-8">
        <div className="h-72 animate-pulse rounded-xl border bg-[var(--surface)]" />
      </main>
    );
  }

  // 404 tambem cobre o plano de outro dono: a API nao revela que ele existe.
  if (isError || !plan) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <p className="text-[var(--muted)]">Plano não encontrado.</p>
        <Link
          href="/plans"
          className="mt-4 inline-flex min-h-11 items-center rounded-md border px-5 text-sm"
        >
          Voltar aos planos
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link
        href="/plans"
        className="mb-5 inline-flex items-center gap-1.5 font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted)] transition-colors hover:text-[var(--text)]"
      >
        <ArrowLeft size={13} aria-hidden />
        Planos
      </Link>

      {editing ? (
        <>
          <h1 className="mb-6 font-[family-name:var(--font-display-face)] text-2xl font-bold tracking-tight">
            Editando plano
          </h1>
          <PlanEditor
            initial={plan}
            submitLabel="Salvar alterações"
            saving={update.isPending}
            error={update.error ? update.error.message : null}
            onSubmit={(input) =>
              update.mutate(input, { onSuccess: () => setEditing(false) })
            }
          />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="mt-3 min-h-11 w-full rounded-md border text-sm text-[var(--muted)] sm:w-auto sm:px-5"
          >
            Cancelar
          </button>
        </>
      ) : (
        <PlanView plan={plan} onEdit={() => setEditing(true)} />
      )}
    </main>
  );
}

function PlanView({ plan, onEdit }: { plan: Plan; onEdit: () => void }) {
  const activate = useActivatePlan();

  return (
    <>
      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--font-display-face)] text-3xl font-bold tracking-tight">
              {plan.name}
            </h1>
            <p className="mt-1 font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted-2)]">
              {plan.days.length} {plan.days.length === 1 ? "dia" : "dias"} ·{" "}
              {plan.source === "AI" ? "gerado por IA" : "manual"}
            </p>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
          >
            <Pencil size={14} aria-hidden />
            Editar
          </button>
        </div>

        {plan.notes ? (
          <p className="mt-3 text-sm text-[var(--muted)]">{plan.notes}</p>
        ) : null}

        {plan.isActive ? (
          <p className="mt-4 flex items-center gap-1.5 rounded-md bg-[var(--m-legs)]/12 px-3 py-2 font-[family-name:var(--font-mono-face)] text-xs text-[var(--m-legs)]">
            <Check size={13} strokeWidth={3} aria-hidden />
            Este é o seu plano ativo.
          </p>
        ) : (
          <button
            type="button"
            disabled={activate.isPending}
            onClick={() => activate.mutate(plan.id)}
            className="mt-4 min-h-11 w-full rounded-md border text-sm font-medium text-[var(--muted)] transition-colors hover:border-[var(--muted-2)] hover:text-[var(--text)] disabled:opacity-50"
          >
            {activate.isPending ? "Ativando..." : "Tornar plano ativo"}
          </button>
        )}
      </header>

      <div className="space-y-3">
        {plan.days.map((day, index) => (
          <section
            key={day.id}
            className="overflow-hidden rounded-xl border bg-[var(--surface)]"
          >
            <div className="flex items-baseline gap-3 border-b px-4 py-3">
              <span className="font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted-2)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="font-[family-name:var(--font-display-face)] text-base font-bold">
                {day.name}
              </h2>
              {day.focus ? (
                <span className="truncate text-xs text-[var(--muted-2)]">
                  {day.focus}
                </span>
              ) : null}
            </div>

            <ul className="divide-y">
              {day.exercises.map((pe) => (
                <li key={pe.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    aria-hidden
                    className="h-8 w-1 shrink-0 rounded-full"
                    style={{
                      background: MUSCLE_META[pe.exercise.muscleGroup].color,
                    }}
                  />
                  <Link
                    href={`/exercises/${pe.exercise.slug}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                  >
                    {pe.exercise.name}
                  </Link>
                  <span className="shrink-0 font-[family-name:var(--font-mono-face)] text-xs tabular-nums text-[var(--muted)]">
                    {pe.sets}×{pe.repScheme}
                  </span>
                  <span className="hidden shrink-0 font-[family-name:var(--font-mono-face)] text-xs tabular-nums text-[var(--muted-2)] sm:inline">
                    {pe.restSec}s
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
