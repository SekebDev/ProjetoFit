"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ArrowLeft, Flag } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { LastLoad, Session } from "@workout/shared";
import { Mascot } from "@/components/Mascot";
import { SetLogger } from "@/components/SetLogger";
import { fireConfetti } from "@/lib/rackie/confetti";
import { pickPhrase } from "@/lib/rackie/phrases";
import { useAuth } from "@/lib/auth";
import {
  useFinishSession,
  useLastLoads,
  useSession,
} from "@/lib/hooks/useSessions";

function formataDuracao(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const min = Math.round((totalSec % 3600) / 60);
  return h > 0 ? `${h}h ${String(min).padStart(2, "0")}min` : `${min}min`;
}

export default function WorkoutPage() {
  const { planDayId } = useParams<{ planDayId: string }>();
  const { user, loading } = useAuth();
  const session = useSession(planDayId);
  const lastLoads = useLastLoads(planDayId);

  if (loading) return <Esqueleto />;
  if (!user) return <Deslogado />;
  // Espera as duas: sem as ultimas cargas, os campos montariam vazios e o
  // pre-preenchimento nao apareceria (o estado inicial do input so e lido uma vez).
  if (session.isLoading || lastLoads.isLoading) return <Esqueleto />;

  if (session.isError) return <Aviso texto={session.error.message} />;
  if (!session.data) return <Esqueleto />;

  return (
    <Treino
      session={session.data}
      lastLoads={lastLoads.data ?? []}
      planDayId={planDayId}
    />
  );
}

function Treino({
  session,
  lastLoads,
  planDayId,
}: {
  session: Session;
  lastLoads: LastLoad[];
  planDayId: string;
}) {
  const [notas, setNotas] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const finish = useFinishSession(session.id, planDayId);
  // Suaviza a troca entre o botao "Encerrar" e o formulario de confirmacao.
  const [confirmRef] = useAutoAnimate<HTMLDivElement>();

  const dia = session.planDay;
  const encerrada = session.finishedAt !== null;

  // O plano foi editado durante a sessao: a FK virou null (SetNull) pra nao
  // travar a edicao. As series gravadas continuam intactas, mas nao ha mais
  // prescricao pra mostrar.
  if (!dia) {
    return (
      <Aviso texto="Este plano mudou depois que o treino começou. As séries registradas foram mantidas no histórico." />
    );
  }

  const prescritas = dia.exercises.reduce((soma, pe) => soma + pe.sets, 0);
  const feitas = session.setLogs.length;

  if (encerrada) {
    return (
      <TreinoConcluido feitas={feitas} durationSec={session.durationSec} />
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-[var(--bottom-nav-space)]">
      <header className="mb-5">
        <Link
          href="/plans"
          className="inline-flex items-center gap-1 font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted-2)] transition-colors hover:text-[var(--text)]"
        >
          <ArrowLeft size={12} aria-hidden />
          Planos
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display-face)] text-3xl font-bold tracking-tight">
          {dia.name}
        </h1>
        <p className="mt-1 font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted-2)]">
          {dia.focus ? `${dia.focus} · ` : ""}
          {feitas}/{prescritas} séries
        </p>
      </header>

      <ul className="space-y-3">
        {dia.exercises.map((pe) => (
          <SetLogger
            key={pe.id}
            planExercise={pe}
            sessionId={session.id}
            planDayId={planDayId}
            lastLoad={lastLoads.find((l) => l.exercise.id === pe.exercise.id)}
            logs={session.setLogs.filter((l) => l.exerciseId === pe.exercise.id)}
            disabled={finish.isPending}
          />
        ))}
      </ul>

      <div
        ref={confirmRef}
        className="sticky bottom-[var(--bottom-nav-space)] mt-4 rounded-xl border bg-[var(--surface)]/95 p-3 backdrop-blur"
      >
        {confirmando ? (
          <div className="space-y-2">
            <label
              htmlFor="notas"
              className="font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted-2)]"
            >
              Notas (opcional)
            </label>
            <textarea
              id="notas"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Como foi o treino?"
              className="w-full rounded-md border bg-[var(--surface-2)] p-2 text-sm focus:border-[var(--chalk)] focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="min-h-11 flex-1 rounded-md border text-sm text-[var(--muted)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={finish.isPending}
                onClick={() => finish.mutate(notas.trim() || null)}
                className="min-h-11 flex-1 rounded-md bg-[var(--m-legs)] text-sm font-semibold text-white disabled:opacity-50"
              >
                {finish.isPending ? "Encerrando..." : "Confirmar"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--chalk)] text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            <Flag size={14} strokeWidth={2.5} aria-hidden />
            Encerrar treino
          </button>
        )}

        {finish.isError ? (
          <p role="alert" className="mt-2 text-xs text-[var(--m-chest)]">
            {finish.error.message}
          </p>
        ) : null}
      </div>
    </main>
  );
}

/**
 * Tela de treino concluido: a Rackie comemora com um estouro de particulas e
 * uma frase de fechamento. A frase e sorteada uma vez (useState inicial) pra
 * nao trocar a cada repaint enquanto a tela esta aberta.
 */
function TreinoConcluido({
  feitas,
  durationSec,
}: {
  feitas: number;
  durationSec: number | null;
}) {
  const [frase] = useState(() => pickPhrase("day"));

  // Comemora uma vez ao montar a tela de conclusao.
  useEffect(() => {
    fireConfetti("day");
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-[var(--surface)] py-12 text-center">
        <Mascot state="cheer" size="md" />
        <h1 className="font-[family-name:var(--font-display-face)] text-2xl font-bold">
          Treino concluído
        </h1>
        <p className="font-[family-name:var(--font-mono-face)] text-sm text-[var(--muted)]">
          {feitas} {feitas === 1 ? "série" : "séries"}
          {durationSec !== null ? ` · ${formataDuracao(durationSec)}` : ""}
        </p>
        <p className="max-w-xs font-[family-name:var(--font-display-face)] text-base font-bold text-[var(--text)]">
          {frase}
        </p>
        <Link
          href="/plans"
          className="mt-2 flex min-h-11 items-center rounded-md bg-[var(--chalk)] px-5 text-sm font-semibold text-black"
        >
          Voltar aos planos
        </Link>
      </div>
    </main>
  );
}

function Esqueleto() {
  return (
    <main className="mx-auto max-w-2xl space-y-3 px-5 py-8">
      <div className="h-10 w-40 animate-pulse rounded-md bg-[var(--surface)]" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-xl border bg-[var(--surface)]"
        />
      ))}
    </main>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <div className="rounded-xl border bg-[var(--surface)] p-8 text-center">
        <p className="text-sm text-[var(--muted)]">{texto}</p>
        <Link
          href="/plans"
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[var(--chalk)] px-5 text-sm font-semibold text-black"
        >
          Voltar aos planos
        </Link>
      </div>
    </main>
  );
}

function Deslogado() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <div className="rounded-xl border bg-[var(--surface)] p-8 text-center">
        <p className="text-[var(--muted)]">Entre para treinar.</p>
        <Link
          href="/login"
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[var(--chalk)] px-5 text-sm font-semibold text-black"
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
