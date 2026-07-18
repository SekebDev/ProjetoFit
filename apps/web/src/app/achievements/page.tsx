"use client";

import type { Achievement } from "@workout/shared";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useAchievements } from "@/lib/hooks/useGame";

export default function AchievementsPage() {
  const { user, loading } = useAuth();
  const { data, isLoading } = useAchievements();

  const desbloqueadas = data?.filter((a) => a.unlockedAt !== null).length ?? 0;

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 pb-[var(--bottom-nav-space)]">
      <header>
        <p className="font-[family-name:var(--font-mono-face)] text-[11px] uppercase tracking-widest text-[var(--muted-2)]">
          Gamificação
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display-face)] text-3xl font-bold tracking-tight">
          Conquistas
        </h1>
        {user && data ? (
          <p className="mt-1 text-sm text-[var(--muted)]">
            {desbloqueadas} de {data.length} desbloqueadas
          </p>
        ) : null}
      </header>

      {/* Sem o ramo do deslogado, a query tomaria 401 e a tela mostraria a
          lista vazia — dizendo "voce nao tem conquista nenhuma" pra quem nem
          entrou. Mesmo tratamento de /progress. */}
      {loading || (user && isLoading) ? (
        <ul className="mt-6 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <li
              key={i}
              className="h-20 animate-pulse rounded-xl border bg-[var(--surface)]"
            />
          ))}
        </ul>
      ) : !user ? (
        <Deslogado />
      ) : (
        <ul className="mt-6 space-y-3">
          {data?.map((a) => (
            <li key={a.code}>
              <CardConquista achievement={a} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Deslogado() {
  return (
    <div className="mt-6 rounded-xl border bg-[var(--surface)] p-8 text-center">
      <p className="text-[var(--muted)]">Entre para ver suas conquistas.</p>
      <Link
        href="/login"
        className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[var(--chalk)] px-5 text-sm font-semibold text-black"
      >
        Entrar
      </Link>
    </div>
  );
}

function CardConquista({ achievement }: { achievement: Achievement }) {
  const desbloqueada = achievement.unlockedAt !== null;
  const pct = Math.min(100, (achievement.progress / achievement.target) * 100);

  return (
    <section
      className={
        "flex items-start gap-3 rounded-xl border p-4 " +
        (desbloqueada
          ? "border-[var(--m-shoulders)]/40 bg-[var(--m-shoulders)]/10"
          : "bg-[var(--surface)]")
      }
    >
      <span
        aria-hidden
        className={
          "shrink-0 text-2xl leading-none " +
          // A bloqueada fica dessaturada: da pra ver o que e sem parecer ganha.
          (desbloqueada ? "" : "opacity-30 grayscale")
        }
      >
        {achievement.icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display-face)] text-base font-bold">
            {achievement.name}
          </h2>
          <span className="shrink-0 font-[family-name:var(--font-mono-face)] text-[11px] text-[var(--muted-2)]">
            +{achievement.xpReward} XP
          </span>
        </div>

        <p className="mt-0.5 text-sm text-[var(--muted)]">
          {achievement.description}
        </p>

        {desbloqueada ? (
          <p className="mt-2 font-[family-name:var(--font-mono-face)] text-[11px] text-[var(--m-shoulders)]">
            Desbloqueada em {formataData(achievement.unlockedAt)}
          </p>
        ) : (
          <div className="mt-2">
            <div
              className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]"
              role="progressbar"
              aria-valuenow={achievement.progress}
              aria-valuemin={0}
              aria-valuemax={achievement.target}
              aria-label={`Progresso: ${achievement.name}`}
            >
              <div
                className="h-full rounded-full bg-[var(--muted-2)]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 flex items-center gap-1 font-[family-name:var(--font-mono-face)] text-[11px] text-[var(--muted-2)]">
              <Lock size={11} strokeWidth={2.5} aria-hidden />
              {formataNumero(achievement.progress)} /{" "}
              {formataNumero(achievement.target)}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/** Arredonda pra inteiro: volume em kg com decimal so polui o card. */
function formataNumero(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

function formataData(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
