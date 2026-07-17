"use client";

import Link from "next/link";
import { AIPlanForm } from "@/components/AIPlanForm";
import { Mascot } from "@/components/Mascot";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/hooks/useProfile";

export default function GeneratePage() {
  const { user, loading } = useAuth();
  const { data: profile, isLoading } = useProfile(!!user);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <header className="mb-6">
        <p className="font-[family-name:var(--font-mono-face)] text-xs uppercase tracking-[0.25em] text-[var(--muted-2)]">
          Treinador
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display-face)] text-3xl font-bold tracking-tight">
          Gerar plano
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          A IA monta um plano a partir do seu perfil, usando só exercícios da
          biblioteca.
        </p>
      </header>

      {loading || (user && isLoading) ? (
        <div className="h-64 animate-pulse rounded-xl border bg-[var(--surface)]" />
      ) : !user ? (
        <SignedOut />
      ) : !profile ? (
        // Sem perfil o backend devolveria 404: melhor mandar preencher antes de
        // deixar clicar num botao que so pode falhar.
        <SemPerfil />
      ) : (
        <AIPlanForm profile={profile} />
      )}
    </main>
  );
}

function SemPerfil() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border bg-[var(--surface)] p-8 text-center">
      <Mascot state="idle" size="md" />
      <p className="text-sm text-[var(--muted)]">
        A IA precisa saber seu objetivo, seu nível e o equipamento que você tem.
        Leva um minuto.
      </p>
      <Link
        href="/profile"
        className="mt-1 flex min-h-11 items-center rounded-md bg-[var(--chalk)] px-5 text-sm font-semibold text-black"
      >
        Preencher perfil
      </Link>
    </div>
  );
}

function SignedOut() {
  return (
    <div className="rounded-xl border bg-[var(--surface)] p-8 text-center">
      <p className="text-[var(--muted)]">Entre para gerar um plano.</p>
      <Link
        href="/login"
        className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[var(--chalk)] px-5 text-sm font-semibold text-black"
      >
        Entrar
      </Link>
    </div>
  );
}
