"use client";

import type { Group } from "@workout/shared";
import { ArrowLeft, LogOut } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CodigoConvite } from "@/components/groups/CodigoConvite";
import { Leaderboard } from "@/components/groups/Leaderboard";
import { useAuth } from "@/lib/auth";
import { useGroup, useLeaveGroup } from "@/lib/hooks/useGroups";

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: grupo, isLoading, isError } = useGroup(params.id);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-8">
        <div className="h-72 animate-pulse rounded-xl border bg-[var(--surface)]" />
      </main>
    );
  }

  // 404 tambem cobre o grupo alheio: a API responde a mesma coisa pra quem nao
  // e membro, justamente pra nao confirmar que o grupo existe.
  if (isError || !grupo || !user) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <p className="text-[var(--muted)]">Grupo não encontrado.</p>
        <Link href="/groups" className="mt-4 inline-flex text-sm underline">
          Voltar aos grupos
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 pb-[var(--bottom-nav-space)]">
      <Link
        href="/groups"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]"
      >
        <ArrowLeft size={15} strokeWidth={2.5} aria-hidden />
        Grupos
      </Link>

      <header className="mt-3">
        <h1 className="font-[family-name:var(--font-display-face)] text-3xl font-bold tracking-tight">
          {grupo.name}
        </h1>
        {grupo.description ? (
          <p className="mt-1 text-sm text-[var(--muted)]">{grupo.description}</p>
        ) : null}
        <p className="mt-1 font-[family-name:var(--font-mono-face)] text-[11px] text-[var(--muted-2)]">
          {grupo.memberCount}{" "}
          {grupo.memberCount === 1 ? "participante" : "participantes"}
        </p>
      </header>

      <div className="mt-6">
        <CodigoConvite code={grupo.inviteCode} />
      </div>

      <div className="mt-6">
        <Leaderboard groupId={grupo.id} meuUserId={user.id} />
      </div>

      <Sair grupo={grupo} />
    </main>
  );
}

function Sair({ grupo }: { grupo: Group }) {
  const [confirmando, setConfirmando] = useState(false);
  const leave = useLeaveGroup();
  const router = useRouter();

  const souDono = grupo.role === "OWNER";
  const souOUltimo = grupo.memberCount === 1;

  // O texto muda porque a CONSEQUENCIA muda, e ela nao e obvia: o dono que sai
  // nao leva o grupo junto (a posse passa), a menos que nao sobre ninguem.
  const aviso = !souDono
    ? "Você deixa de ver o ranking deste grupo."
    : souOUltimo
      ? "Você é a última pessoa aqui — o grupo será apagado."
      : "A posse passa para o participante mais antigo.";

  function sair(): void {
    leave.mutate(grupo.id, { onSuccess: () => router.push("/groups") });
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--m-chest)]"
      >
        <LogOut size={15} strokeWidth={2.5} aria-hidden />
        Sair do grupo
      </button>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-[var(--m-chest)]/40 bg-[var(--m-chest)]/10 p-4">
      <p className="font-[family-name:var(--font-display-face)] text-sm font-bold">
        Sair de {grupo.name}?
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">{aviso}</p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={sair}
          disabled={leave.isPending}
          className="min-h-11 rounded-md bg-[var(--m-chest)] px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          {leave.isPending ? "Saindo..." : "Sair"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="min-h-11 rounded-md border px-4 text-sm font-medium text-[var(--muted)]"
        >
          Cancelar
        </button>
      </div>

      {leave.error ? (
        <p role="alert" className="mt-2 text-sm text-[var(--m-chest)]">
          {leave.error.message}
        </p>
      ) : null}
    </section>
  );
}
