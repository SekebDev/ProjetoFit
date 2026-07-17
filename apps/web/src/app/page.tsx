"use client";

import { BatteryLow } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { Deload, Health } from "@workout/shared";
import { Mascot } from "@/components/Mascot";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useDeload } from "@/lib/hooks/useProgress";

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

function DeloadBanner() {
  const { user } = useAuth();
  const { data } = useDeload();

  if (!user || !data?.recommend) return null;

  return (
    <section
      role="status"
      className="mt-8 flex items-start gap-3 rounded-xl border border-[var(--m-arms)]/40 bg-[var(--m-arms)]/10 p-4"
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
        <p className="mt-1 text-sm text-[var(--muted)]">
          {mensagemDeload(data)}
        </p>
      </div>
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
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
            {user
              ? `Bem-vindo de volta, ${user.name ?? user.email}.`
              : "Biblioteca de exercicios, registro de progressao e planos gerados por IA a partir do seu perfil."}
          </p>
        </div>

        <Mascot
          state="idle"
          size="lg"
          className="mascot-float hidden shrink-0 sm:block"
        />
      </section>

      <DeloadBanner />

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        <HubCard
          href="/exercises"
          eyebrow="873 exercicios"
          title="Biblioteca"
          color="var(--m-back)"
        />
        <HubCard
          href="/profile"
          eyebrow="Sua ficha"
          title="Perfil"
          color="var(--m-arms)"
        />
        <HubCard
          href={user ? "/exercises" : "/login"}
          eyebrow={user ? "Continuar" : "Comecar"}
          title={user ? "Treinar" : "Entrar"}
          color="var(--m-legs)"
        />
      </section>
    </main>
  );
}

function HubCard({
  href,
  eyebrow,
  title,
  color,
}: {
  href: string;
  eyebrow: string;
  title: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl border bg-[var(--surface)] p-5 transition-colors hover:border-[var(--muted-2)]"
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: color }}
      />
      <p className="font-[family-name:var(--font-mono-face)] text-[11px] uppercase tracking-widest text-[var(--muted-2)]">
        {eyebrow}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display-face)] text-xl font-semibold">
        {title}
      </p>
      <span className="mt-6 inline-block text-[var(--muted)] transition-transform group-hover:translate-x-1">
        &rarr;
      </span>
    </Link>
  );
}
