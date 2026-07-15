"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlanEditor } from "@/components/PlanEditor";
import { useAuth } from "@/lib/auth";
import { useCreatePlan } from "@/lib/hooks/usePlans";

export default function NewPlanPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const create = useCreatePlan();

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link
        href="/plans"
        className="mb-5 inline-flex items-center gap-1.5 font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted)] transition-colors hover:text-[var(--text)]"
      >
        <ArrowLeft size={13} aria-hidden />
        Planos
      </Link>

      <h1 className="mb-6 font-[family-name:var(--font-display-face)] text-3xl font-bold tracking-tight">
        Novo plano
      </h1>

      {loading ? (
        <div className="h-64 animate-pulse rounded-xl border bg-[var(--surface)]" />
      ) : !user ? (
        <div className="rounded-xl border bg-[var(--surface)] p-8 text-center">
          <p className="text-[var(--muted)]">Entre para montar um plano.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[var(--chalk)] px-5 text-sm font-semibold text-black"
          >
            Entrar
          </Link>
        </div>
      ) : (
        <PlanEditor
          submitLabel="Criar plano"
          saving={create.isPending}
          error={create.error ? create.error.message : null}
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: (plan) => router.push(`/plans/${plan.id}`),
            })
          }
        />
      )}
    </main>
  );
}
