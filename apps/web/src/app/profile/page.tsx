"use client";

import Link from "next/link";
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
        <ProfileForm
          initial={profile ?? null}
          saving={update.isPending}
          saved={update.isSuccess}
          onSubmit={(input) => update.mutate(input)}
        />
      )}
    </main>
  );
}
