"use client";

import { BatteryLow, Flame, Play, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type {
  Deload,
  Health,
  NextWorkout,
  PlanSummary,
  Session,
} from "@workout/shared";
import { BarraXp } from "@/components/game/BarraXp";
import { Mascot } from "@/components/Mascot";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useDeload, useStreak } from "@/lib/hooks/useProgress";
import { useNextWorkout, usePlans } from "@/lib/hooks/usePlans";
import { useActiveSession } from "@/lib/hooks/useSessions";
import { moodForStreak } from "@/lib/rackie/streak-mood";

/** ISO 1=segunda .. 7=domingo. O indice 0 fica vazio de proposito. */
const WEEKDAY_LABELS = [
  "",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return <PainelEsqueleto />;
  return user ? <Painel /> : <Vitrine />;
}

/* ------------------------------------------------------------------ */
/* Painel (logado): o centro do app                                    */
/* ------------------------------------------------------------------ */

function Painel() {
  const { user } = useAuth();
  const nome = user?.name ?? user?.email ?? "";

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 pb-[var(--bottom-nav-space)]">
      <header>
        <p className="font-[family-name:var(--font-mono-face)] text-[11px] uppercase tracking-widest text-[var(--muted-2)]">
          Seu treino
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display-face)] text-3xl font-bold tracking-tight">
          Olá, {nome}
        </h1>
      </header>

      <div className="mt-6 space-y-4">
        <CardPrincipal />
        <CardSequencia />
        <BarraXp />
        <BannerDeload />
      </div>

      <Atalhos />
    </main>
  );
}

/**
 * O card que manda o usuario treinar. Prioridade:
 * 1. sessao em aberto -> retomar de onde parou;
 * 2. proximo treino agendado -> iniciar o dia;
 * 3. sem sugestao -> guiar a criar/agendar um plano.
 */
function CardPrincipal() {
  const active = useActiveSession();
  const next = useNextWorkout();
  const plans = usePlans();

  if (active.data) return <CardRetomar session={active.data} />;
  if (active.isLoading || next.isLoading) return <CardSkeleton />;
  if (next.data) return <CardProximo next={next.data} />;

  return <CardSemTreino plans={plans.data ?? []} />;
}

/**
 * O `planDayId` aqui e sempre preenchido: o servidor ignora sessao aberta sem
 * dia (sessions.service.activeSession), justamente porque ela nao tem pra onde
 * retomar. Por isso o link nao precisa de fallback.
 */
function CardRetomar({ session }: { session: Session }) {
  const nome = session.planDay?.name ?? "Treino";
  const feitas = session.setLogs.length;

  return (
    <Link
      href={`/workout/${session.planDayId}`}
      className="group block rounded-xl border border-[var(--m-legs)]/50 bg-[var(--m-legs)]/10 p-5 transition-colors hover:border-[var(--m-legs)]"
    >
      <Eyebrow>Em andamento</Eyebrow>
      <h2 className="mt-1 font-[family-name:var(--font-display-face)] text-2xl font-bold">
        {nome}
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {feitas} {feitas === 1 ? "série registrada" : "séries registradas"}
      </p>
      <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--m-legs)] px-4 text-sm font-semibold text-white">
        <RotateCcw size={16} strokeWidth={2.5} aria-hidden />
        Retomar treino
      </span>
    </Link>
  );
}

function CardProximo({ next }: { next: NextWorkout }) {
  const quando = next.isToday
    ? "Hoje"
    : next.weekday
      ? WEEKDAY_LABELS[next.weekday]
      : "Próximo";

  return (
    <Link
      href={`/workout/${next.planDayId}`}
      className="group block rounded-xl border bg-[var(--surface)] p-5 transition-colors hover:border-[var(--chalk)]"
    >
      <Eyebrow>{quando} · próximo treino</Eyebrow>
      <h2 className="mt-1 font-[family-name:var(--font-display-face)] text-2xl font-bold">
        {next.name}
      </h2>
      {next.focus ? (
        <p className="mt-1 text-sm text-[var(--muted)]">{next.focus}</p>
      ) : null}
      <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--chalk)] px-4 text-sm font-semibold text-black transition-opacity group-hover:opacity-90">
        <Play size={16} strokeWidth={2.5} aria-hidden />
        Iniciar dia
      </span>
    </Link>
  );
}

function CardSemTreino({ plans }: { plans: PlanSummary[] }) {
  const ativo = plans.find((p) => p.isActive);

  // Plano ativo existe, mas sem dias agendados: mandar pro editor pra marcar os
  // dias da semana. Sem plano ativo: criar/ativar um.
  const { titulo, texto, href, cta } = ativo
    ? {
        titulo: "Agende seus treinos",
        texto: "Seu plano ativo ainda não tem dias marcados na semana.",
        href: `/plans/${ativo.id}`,
        cta: "Agendar dias",
      }
    : {
        titulo: "Comece por um plano",
        texto: "Crie ou ative um plano para o painel montar sua semana.",
        href: "/plans",
        cta: "Ver planos",
      };

  return (
    <div className="rounded-xl border border-dashed bg-[var(--surface)] p-5">
      <h2 className="font-[family-name:var(--font-display-face)] text-xl font-bold">
        {titulo}
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{texto}</p>
      <Link
        href={href}
        className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[var(--chalk)] px-4 text-sm font-semibold text-black"
      >
        {cta}
      </Link>
    </div>
  );
}

/**
 * A sequência com a Rackie reagindo — o coração da gamificação no painel.
 *
 * A pose e a fala saem do estado devolvido pelo servidor: comemora quando o dia
 * agendado foi cumprido, cobra (sem culpa) quando está em risco, e comemora o
 * descanso nos dias de folga — fiel ao que a mascote se propõe a ser.
 */
function CardSequencia() {
  const { data, isLoading } = useStreak();

  if (isLoading) {
    return (
      <div className="h-28 animate-pulse rounded-xl border bg-[var(--surface)]" />
    );
  }
  if (!data) return null;

  const { pose, phrase } = moodForStreak(data);
  const semAgenda = data.state === "unscheduled";
  const viva = data.current > 0;

  return (
    <section className="flex items-center gap-4 rounded-xl border bg-[var(--surface)] p-4">
      <Mascot state={pose} size="md" className="shrink-0" />

      <div className="min-w-0 flex-1">
        {semAgenda ? (
          <p className="font-[family-name:var(--font-display-face)] text-base font-bold">
            Sequência
          </p>
        ) : (
          <div className="flex items-center gap-1.5">
            <Flame
              size={18}
              strokeWidth={2.5}
              aria-hidden
              className={
                viva ? "text-[var(--m-shoulders)]" : "text-[var(--muted-2)]"
              }
            />
            <span className="font-[family-name:var(--font-display-face)] text-3xl font-bold tabular-nums leading-none">
              {data.current}
            </span>
            <span className="text-sm text-[var(--muted)]">
              {data.current === 1 ? "dia" : "dias"}
            </span>
          </div>
        )}

        <p className="mt-1.5 text-sm text-[var(--muted)]">{phrase}</p>

        {semAgenda ? (
          <Link
            href="/plans"
            className="mt-2 inline-flex text-sm font-semibold underline"
          >
            Agendar dias
          </Link>
        ) : data.best > data.current ? (
          <p className="mt-1 font-[family-name:var(--font-mono-face)] text-[11px] text-[var(--muted-2)]">
            Melhor sequência: {data.best}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function BannerDeload() {
  const { data } = useDeload();
  if (!data?.recommend) return null;

  return (
    <section
      role="status"
      className="flex items-start gap-3 rounded-xl border border-[var(--m-arms)]/40 bg-[var(--m-arms)]/10 p-4"
    >
      <BatteryLow
        size={20}
        strokeWidth={2.5}
        className="mt-0.5 shrink-0 text-[var(--m-arms)]"
        aria-hidden
      />
      <div>
        <p className="font-[family-name:var(--font-display-face)] text-sm font-bold">
          Considere um deload
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">{mensagemDeload(data)}</p>
      </div>
    </section>
  );
}

/** Texto da sugestao conforme o gatilho (fadiga, ciclo ou os dois). */
function mensagemDeload(d: Deload): string {
  const queda =
    d.dropPct !== null ? ` (~${Math.round(d.dropPct * 100)}% a menos)` : "";
  switch (d.reason) {
    case "FATIGUE":
      return `Seu volume caiu na última semana${queda}. Pode ser fadiga — vale uma semana mais leve.`;
    case "CYCLE":
      return `São ${d.hardWeekStreak} semanas pesadas seguidas. Um deload agora ajuda a recuperar e voltar mais forte.`;
    case "BOTH":
      return `Volume caindo${queda} depois de ${d.hardWeekStreak} semanas pesadas. Seu corpo está pedindo um deload.`;
    default:
      return "";
  }
}

/** Atalhos secundarios — pequenos de proposito: a navegacao principal e a barra. */
function Atalhos() {
  return (
    <nav className="mt-8 flex flex-wrap gap-2">
      {[
        { href: "/plans", label: "Planos" },
        { href: "/progress", label: "Progresso" },
        { href: "/exercises", label: "Biblioteca" },
      ].map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="rounded-md border px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:border-[var(--muted-2)] hover:text-[var(--text)]"
        >
          {a.label}
        </Link>
      ))}
    </nav>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-[family-name:var(--font-mono-face)] text-[11px] uppercase tracking-widest text-[var(--muted-2)]">
      {children}
    </span>
  );
}

function CardSkeleton() {
  return (
    <div className="h-44 animate-pulse rounded-xl border bg-[var(--surface)]" />
  );
}

function PainelEsqueleto() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-5 py-8">
      <div className="h-10 w-48 animate-pulse rounded-md bg-[var(--surface)]" />
      <CardSkeleton />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Vitrine (deslogado): a landing                                      */
/* ------------------------------------------------------------------ */

function Vitrine() {
  const { data: health } = useQuery<Health>({
    queryKey: ["health"],
    queryFn: () => apiFetch<Health>("/health"),
    refetchInterval: 10_000,
  });

  return (
    <main className="mx-auto max-w-6xl px-5 py-14">
      <section className="flex items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="mb-4 flex items-center gap-2">
            <span
              className={
                "inline-block h-2 w-2 rounded-full " +
                (health ? "bg-[var(--m-legs)]" : "bg-[var(--muted-2)]")
              }
            />
            <span className="font-[family-name:var(--font-mono-face)] text-[11px] uppercase tracking-widest text-[var(--muted)]">
              {health ? "sistema online" : "conectando..."}
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-display-face)] text-5xl font-bold leading-[1.05] tracking-tight">
            Levante com
            <br />
            <span className="text-[var(--muted)]">metodo.</span>
          </h1>
          <p className="mt-4 text-[var(--muted)]">
            Biblioteca de exercicios, registro de progressao e planos gerados por
            IA a partir do seu perfil.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-md bg-[var(--chalk)] px-5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              Entrar
            </Link>
            <Link
              href="/exercises"
              className="inline-flex min-h-11 items-center rounded-md border px-5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
            >
              Ver biblioteca
            </Link>
            <a
              href="/app/hipertrof.apk"
              download
              className="inline-flex min-h-11 items-center rounded-md bg-[var(--m-legs)] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              📱 Baixar App
            </a>
          </div>
        </div>

        <Mascot
          state="idle"
          size="lg"
          className="mascot-float hidden shrink-0 sm:block"
        />
      </section>
    </main>
  );
}
