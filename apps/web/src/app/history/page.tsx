"use client";

import type { SessionSummary } from "@workout/shared";
import { Clock, Dumbbell, RotateCw } from "lucide-react";
import Link from "next/link";
import { Mascot } from "@/components/Mascot";
import { useAuth } from "@/lib/auth";
import { useSessionHistory } from "@/lib/hooks/useSessions";

/** 3720 -> "1h 02" · 2700 -> "45 min" */
function formataDuracao(sec: number | null): string {
  if (sec === null) return "—";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h ${String(min % 60).padStart(2, "0")}`;
}

function formataData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function mesDe(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

interface Mes {
  mes: string;
  sessions: SessionSummary[];
}

/**
 * Agrupa por mes pra lista longa nao virar um paredao de datas.
 *
 * A lista ja vem ordenada por data desc, entao basta agrupar os vizinhos — nao
 * precisa de Map nem de sort.
 */
function agrupaPorMes(sessions: SessionSummary[]): Mes[] {
  return sessions.reduce<Mes[]>((grupos, s) => {
    const mes = mesDe(s.date);
    const ultimo = grupos.at(-1);
    return ultimo?.mes === mes
      ? [...grupos.slice(0, -1), { mes, sessions: [...ultimo.sessions, s] }]
      : [...grupos, { mes, sessions: [s] }];
  }, []);
}

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const { data: sessions, isLoading, isError, refetch } = useSessionHistory();

  // A sessao aberta nao e historico — ela ainda esta acontecendo.
  const encerradas = sessions?.filter((s) => s.finishedAt !== null) ?? [];

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6">
        <p className="font-[family-name:var(--font-mono-face)] text-xs uppercase tracking-[0.25em] text-[var(--muted-2)]">
          Registro
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display-face)] text-3xl font-bold tracking-tight">
          Histórico
        </h1>
      </header>

      {loading || (user && isLoading) ? (
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="h-20 animate-pulse rounded-xl border bg-[var(--surface)]"
            />
          ))}
        </ul>
      ) : !user ? (
        <SignedOut />
      ) : isError ? (
        // Antes do <Vazio />: o `?? []` acima transforma falha de rede em lista
        // vazia, e sem este ramo a tela diria "nenhum treino encerrado ainda"
        // pra quem tem historico — afirmando que os dados nao existem quando so
        // a requisicao falhou.
        <Erro onRetry={() => void refetch()} />
      ) : encerradas.length === 0 ? (
        <Vazio />
      ) : (
        <ListaPorMes sessions={encerradas} />
      )}
    </main>
  );
}

function ListaPorMes({ sessions }: { sessions: SessionSummary[] }) {
  return (
    <div className="space-y-5">
      {agrupaPorMes(sessions).map((grupo) => (
        <section key={grupo.mes}>
          <h2 className="mb-2 font-[family-name:var(--font-mono-face)] text-[11px] uppercase tracking-widest text-[var(--muted-2)]">
            {grupo.mes}
          </h2>
          <ul className="space-y-3">
            {grupo.sessions.map((s) => (
              <li key={s.id}>
                <SessionCard session={s} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SessionCard({ session }: { session: SessionSummary }) {
  return (
    <article className="rounded-xl border bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-[family-name:var(--font-display-face)] font-bold">
            {/* null quando o plano foi editado depois do treino: a FK e SetNull
                pra nao travar a edicao, entao o dia pode ter sumido. */}
            {session.planDayName ?? "Treino avulso"}
          </h3>
          <p className="mt-0.5 font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted-2)]">
            {formataData(session.date)}
          </p>
        </div>

        <div className="flex shrink-0 gap-4 text-right">
          <div>
            <p className="flex items-center justify-end gap-1 font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-wider text-[var(--muted-2)]">
              <Dumbbell size={10} aria-hidden />
              séries
            </p>
            <p className="font-[family-name:var(--font-display-face)] text-lg font-bold">
              {session.setCount}
            </p>
          </div>
          <div>
            <p className="flex items-center justify-end gap-1 font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-wider text-[var(--muted-2)]">
              <Clock size={10} aria-hidden />
              duração
            </p>
            <p className="font-[family-name:var(--font-display-face)] text-lg font-bold">
              {formataDuracao(session.durationSec)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

/** O historico existe, a rede e que falhou — ver o Erro de /progress. */
function Erro({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <Mascot state="sad" size="md" />
      <p role="alert" className="text-sm text-[var(--muted)]">
        Não consegui carregar seu histórico. Seus treinos estão salvos.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 flex min-h-11 items-center gap-2 rounded-md bg-[var(--chalk)] px-5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
      >
        <RotateCw size={15} aria-hidden />
        Tentar de novo
      </button>
    </div>
  );
}

function Vazio() {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <Mascot state="sleep" size="md" />
      <p className="text-sm text-[var(--muted)]">
        Nenhum treino encerrado ainda.
      </p>
      <Link
        href="/plans"
        className="mt-1 flex min-h-11 items-center rounded-md bg-[var(--chalk)] px-5 text-sm font-semibold text-black"
      >
        Ver planos
      </Link>
    </div>
  );
}

function SignedOut() {
  return (
    <div className="rounded-xl border bg-[var(--surface)] p-8 text-center">
      <p className="text-[var(--muted)]">Entre para ver seu histórico.</p>
      <Link
        href="/login"
        className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[var(--chalk)] px-5 text-sm font-semibold text-black"
      >
        Entrar
      </Link>
    </div>
  );
}
