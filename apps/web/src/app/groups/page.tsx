"use client";

import type { GroupSummary } from "@workout/shared";
import { GROUP_MAX_MEMBERS } from "@workout/shared";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCreateGroup, useGroups, useJoinGroup } from "@/lib/hooks/useGroups";

export default function GroupsPage() {
  const { user, loading } = useAuth();
  const { data, isLoading } = useGroups();

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 pb-[var(--bottom-nav-space)]">
      <header>
        <p className="font-[family-name:var(--font-mono-face)] text-[11px] uppercase tracking-widest text-[var(--muted-2)]">
          Competição
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display-face)] text-3xl font-bold tracking-tight">
          Grupos
        </h1>
      </header>

      {/* Mesmo tratamento de /achievements e /progress: sem o ramo do deslogado,
          a query tomaria 401 e a tela diria "voce nao tem grupo nenhum" pra
          quem nem entrou. */}
      {loading || (user && isLoading) ? (
        <ul className="mt-6 space-y-3">
          {[0, 1].map((i) => (
            <li
              key={i}
              className="h-20 animate-pulse rounded-xl border bg-[var(--surface)]"
            />
          ))}
        </ul>
      ) : !user ? (
        <Deslogado />
      ) : (
        <>
          <Entrar />
          <Criar />
          <Lista grupos={data ?? []} />
        </>
      )}
    </main>
  );
}

function Deslogado() {
  return (
    <div className="mt-6 rounded-xl border bg-[var(--surface)] p-8 text-center">
      <p className="text-[var(--muted)]">
        Entre para treinar junto com seus amigos.
      </p>
      <Link
        href="/login"
        className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[var(--chalk)] px-5 text-sm font-semibold text-black"
      >
        Entrar
      </Link>
    </div>
  );
}

/**
 * Traduz a falha do POST /groups/join.
 *
 * Errar o codigo e o caso NORMAL desta tela, nao a excecao: a pessoa digita o
 * que veio numa mensagem. Um "Requisição falhou: 404" seria inutil, e o 429 —
 * que existe porque o codigo e a unica credencial adivinhavel do app — precisa
 * dizer que e temporario, senao parece que o codigo esta errado.
 */
function mensagemDoJoin(erro: unknown): string {
  if (!(erro instanceof ApiError)) {
    return "Não deu para entrar agora. Tente de novo.";
  }
  switch (erro.status) {
    case 404:
      return "Código não encontrado. Confira se digitou certo.";
    case 400:
      return `Esse grupo já está cheio (limite de ${GROUP_MAX_MEMBERS}).`;
    case 429:
      return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
    default:
      return erro.message;
  }
}

function Entrar() {
  const [code, setCode] = useState("");
  const join = useJoinGroup();
  const router = useRouter();

  function enviar(e: React.FormEvent): void {
    e.preventDefault();
    if (!code.trim()) return;
    join.mutate(
      { code },
      {
        onSuccess: (grupo) => {
          setCode("");
          router.push(`/groups/${grupo.id}`);
        },
      },
    );
  }

  return (
    <form
      onSubmit={enviar}
      className="mt-6 rounded-xl border bg-[var(--surface)] p-4"
    >
      <label
        htmlFor="codigo"
        className="font-[family-name:var(--font-mono-face)] text-[11px] uppercase tracking-widest text-[var(--muted-2)]"
      >
        Entrar com código
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="codigo"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="K7M2QX9P"
          // O servidor normaliza (maiuscula, sem hifen nem espaco), entao aqui
          // so ajudamos o teclado do celular a nao atrapalhar.
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="min-h-11 min-w-0 flex-1 rounded-md border bg-[var(--bg)] px-3 font-[family-name:var(--font-mono-face)] uppercase tracking-widest"
        />
        <button
          type="submit"
          disabled={join.isPending || !code.trim()}
          className="min-h-11 shrink-0 rounded-md bg-[var(--chalk)] px-4 text-sm font-semibold text-black disabled:opacity-40"
        >
          {join.isPending ? "Entrando..." : "Entrar"}
        </button>
      </div>
      {join.error ? (
        <p role="alert" className="mt-2 text-sm text-[var(--m-chest)]">
          {mensagemDoJoin(join.error)}
        </p>
      ) : null}
    </form>
  );
}

function Criar() {
  const [aberto, setAberto] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const create = useCreateGroup();
  const router = useRouter();

  function enviar(e: React.FormEvent): void {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), description: description.trim() || null },
      { onSuccess: (grupo) => router.push(`/groups/${grupo.id}`) },
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium text-[var(--muted)] transition-colors hover:border-[var(--muted-2)] hover:text-[var(--text)]"
      >
        <Plus size={16} strokeWidth={2.5} aria-hidden />
        Criar um grupo
      </button>
    );
  }

  return (
    <form
      onSubmit={enviar}
      className="mt-3 rounded-xl border bg-[var(--surface)] p-4"
    >
      <p className="font-[family-name:var(--font-mono-face)] text-[11px] uppercase tracking-widest text-[var(--muted-2)]">
        Novo grupo
      </p>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do grupo"
        maxLength={60}
        aria-label="Nome do grupo"
        className="mt-2 min-h-11 w-full rounded-md border bg-[var(--bg)] px-3"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrição (opcional)"
        maxLength={300}
        aria-label="Descrição do grupo"
        className="mt-2 min-h-11 w-full rounded-md border bg-[var(--bg)] px-3"
      />

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={create.isPending || !name.trim()}
          className="min-h-11 rounded-md bg-[var(--chalk)] px-4 text-sm font-semibold text-black disabled:opacity-40"
        >
          {create.isPending ? "Criando..." : "Criar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="min-h-11 rounded-md border px-4 text-sm font-medium text-[var(--muted)]"
        >
          Cancelar
        </button>
      </div>

      {create.error ? (
        <p role="alert" className="mt-2 text-sm text-[var(--m-chest)]">
          {create.error.message}
        </p>
      ) : null}
    </form>
  );
}

function Lista({ grupos }: { grupos: GroupSummary[] }) {
  if (grupos.length === 0) {
    return (
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Você ainda não está em nenhum grupo.
      </p>
    );
  }

  return (
    <ul className="mt-6 space-y-3">
      {grupos.map((g) => (
        <li key={g.id}>
          <Link
            href={`/groups/${g.id}`}
            className="block rounded-xl border bg-[var(--surface)] p-4 transition-colors hover:border-[var(--chalk)]"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="truncate font-[family-name:var(--font-display-face)] text-lg font-bold">
                {g.name}
              </h2>
              {g.role === "OWNER" ? (
                <span className="shrink-0 font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-widest text-[var(--m-shoulders)]">
                  dono
                </span>
              ) : null}
            </div>

            {g.description ? (
              <p className="mt-1 truncate text-sm text-[var(--muted)]">
                {g.description}
              </p>
            ) : null}

            <p className="mt-2 flex items-center gap-1.5 font-[family-name:var(--font-mono-face)] text-[11px] text-[var(--muted-2)]">
              <Users size={12} strokeWidth={2.5} aria-hidden />
              {g.memberCount}{" "}
              {g.memberCount === 1 ? "participante" : "participantes"}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
