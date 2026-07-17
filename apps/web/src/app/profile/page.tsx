"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { BodyCompositionForm } from "@/components/BodyCompositionForm";
import { ProfileForm } from "@/components/ProfileForm";
import { useAuth } from "@/lib/auth";
import { useProfile, useUpdateProfile } from "@/lib/hooks/useProfile";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { data: profile, isLoading } = useProfile(!!user);
  const update = useUpdateProfile();

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <div className="mb-8">
        <p className="font-[family-name:var(--font-mono-face)] text-xs uppercase tracking-[0.25em] text-[var(--muted-2)]">
          Ficha
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display-face)] text-3xl font-bold tracking-tight">
          Perfil de treino
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Base para o gerador de planos por IA.
        </p>
      </div>

      {loading || (user && isLoading) ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border bg-[var(--surface)]"
            />
          ))}
        </div>
      ) : !user ? (
        <div className="rounded-xl border bg-[var(--surface)] p-8 text-center">
          <p className="text-[var(--muted)]">
            Entre para editar seu perfil de treino.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-md bg-[var(--chalk)] px-5 py-2.5 text-sm font-semibold text-black"
          >
            Entrar
          </Link>
        </div>
      ) : (
        <>
          <ProfileForm
            initial={profile ?? null}
            saving={update.isPending}
            saved={update.isSuccess}
            onSubmit={(input) => update.mutate(input)}
          />
          <Avancado />
        </>
      )}
    </main>
  );
}

/**
 * Composicao corporal, fechado por padrao.
 *
 * <details> nativo em vez de useState: e literalmente o elemento que existe pra
 * isto, e vem com teclado, foco e leitor de tela prontos. Um <div> com estado
 * exigiria reimplementar os tres — e reimplementar pior.
 *
 * Fechado por padrao porque a fita metrica nao e rotina: quem abre o perfil
 * quase sempre quer mexer em objetivo ou dias/semana, nao anotar a coxa.
 */
function Avancado() {
  return (
    <details className="group mt-6 rounded-xl border bg-[var(--surface)]">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-4 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          size={16}
          aria-hidden
          className="shrink-0 text-[var(--muted-2)] transition-transform group-open:rotate-90"
        />
        <div>
          <h2 className="font-[family-name:var(--font-display-face)] font-bold">
            Configurações avançadas
          </h2>
          <p className="font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-wider text-[var(--muted-2)]">
            composição corporal
          </p>
        </div>
      </summary>

      <div className="border-t border-[var(--border-soft)] p-4">
        <BodyCompositionForm />
      </div>
    </details>
  );
}
