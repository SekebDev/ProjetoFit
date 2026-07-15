"use client";

import type { PersonalRecord } from "@workout/shared";
import { History, RotateCw, Trophy } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { Mascot } from "@/components/Mascot";
import { WeightForm } from "@/components/WeightForm";
import { useAuth } from "@/lib/auth";
import { useMetrics } from "@/lib/hooks/useMetrics";
import {
  useExerciseProgress,
  useProgressSummary,
} from "@/lib/hooks/useProgress";

function GraficoVazio() {
  return (
    <div className="h-[200px] animate-pulse rounded-md bg-[var(--surface-2)]" />
  );
}

// ssr: false porque o recharts mede o DOM — no servidor nao ha o que medir. De
// quebra tira a biblioteca inteira do bundle inicial: quem nunca abre /progress
// nunca baixa o grafico, o que no celular e o que importa.
const VolumeChart = dynamic(
  () => import("@/components/ProgressChart").then((m) => m.VolumeChart),
  { ssr: false, loading: GraficoVazio },
);

const SeriesChart = dynamic(
  () => import("@/components/ProgressChart").then((m) => m.SeriesChart),
  { ssr: false, loading: GraficoVazio },
);

function formataData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * 62.5 -> "62,5"
 *
 * O app inteiro e pt-BR: o WeightForm aceita virgula e o tooltip do grafico ja
 * formatava assim. Sem isto o usuario digita "82,5" e ve "82.5" de volta.
 */
function formataKg(v: number): string {
  return v.toLocaleString("pt-BR");
}

// As descricoes abaixo sao o que o leitor de tela anuncia no lugar do desenho.
// Elas dizem o numero da ultima semana / do ultimo ponto de proposito: quem nao
// ve o grafico precisa do valor, nao de "grafico de barras de volume semanal".

function descreveVolume(
  semanas: { weekStart: string; volume: number; sessionCount: number }[],
): string {
  const ultima = semanas.at(-1);
  if (!ultima) return "Gráfico de volume semanal, ainda sem dados.";
  return `Gráfico de volume semanal das últimas ${semanas.length} semanas. Na semana mais recente: ${formataKg(Math.round(ultima.volume))} kg em ${ultima.sessionCount} ${ultima.sessionCount === 1 ? "treino" : "treinos"}.`;
}

function descreveSerie(
  pontos: { date: string; value: number | null }[],
  unidade: string,
  assunto: string,
): string {
  // O predicado nao e cerimonia: sem ele o filter devolve (number|null)[] e o
  // buraco da serie (peso corporal, semana sem pesagem) vazaria pro formataKg.
  const valores = pontos
    .map((p) => p.value)
    .filter((v): v is number => v !== null);
  const primeiro = valores.at(0);
  const ultimo = valores.at(-1);
  if (primeiro === undefined || ultimo === undefined) {
    return `Gráfico de ${assunto}, ainda sem dados.`;
  }
  return `Gráfico de ${assunto}, ${valores.length} registros. De ${formataKg(primeiro)} ${unidade} a ${formataKg(ultimo)} ${unidade}.`;
}

export default function ProgressPage() {
  const { user, loading } = useAuth();
  const { data: resumo, isLoading, isError, refetch } = useProgressSummary();

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-[family-name:var(--font-mono-face)] text-xs uppercase tracking-[0.25em] text-[var(--muted-2)]">
            Evolução
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display-face)] text-3xl font-bold tracking-tight">
            Progresso
          </h1>
        </div>
        {user ? (
          <Link
            href="/history"
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border px-4 text-sm font-medium text-[var(--muted)] transition-colors hover:border-[var(--muted-2)] hover:text-[var(--text)]"
          >
            <History size={15} aria-hidden />
            Histórico
          </Link>
        ) : null}
      </header>

      {loading || (user && isLoading) ? (
        <Esqueleto />
      ) : !user ? (
        <SignedOut />
      ) : isError || !resumo ? (
        // Antes do <Vazio />, e nao depois: sem este ramo, uma falha de rede
        // cairia no vazio e diria a quem tem meses de treino que ele nunca
        // treinou. "Nao consegui carregar" e recuperavel; "voce nao tem dados"
        // e uma mentira alarmante.
        <Erro onRetry={() => void refetch()} />
      ) : resumo.totalSessions === 0 ? (
        <Vazio />
      ) : (
        <div className="space-y-4">
          <Secao
            titulo="Volume semanal"
            legenda={`${resumo.totalSessions} ${
              resumo.totalSessions === 1 ? "treino" : "treinos"
            } até agora`}
          >
            <VolumeChart
              data={resumo.weeklyVolume}
              descricao={descreveVolume(resumo.weeklyVolume)}
            />
          </Secao>

          <CargaPorExercicio records={resumo.records} />
          <PesoCorporal />
          <Recordes records={resumo.records} />
        </div>
      )}
    </main>
  );
}

function Secao({
  titulo,
  legenda,
  children,
}: {
  titulo: string;
  legenda?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display-face)] text-lg font-bold">
          {titulo}
        </h2>
        {legenda ? (
          <p className="font-[family-name:var(--font-mono-face)] text-[11px] text-[var(--muted-2)]">
            {legenda}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** O select sai dos records: sao exatamente os exercicios que o usuario treinou. */
function CargaPorExercicio({ records }: { records: PersonalRecord[] }) {
  // `escolhido` guarda so a escolha explicita do usuario; o exercicio ativo e
  // derivado. Inicializar o useState com records[0] parecia equivalente, mas
  // nao e: quem treina so peso corporal monta este componente com records
  // vazio, e o estado nasce "". Ao registrar o primeiro treino com carga, o
  // componente re-renderiza sem remontar — o estado continua "" e o grafico
  // dizia "treine mais uma vez" pra um exercicio ja treinado.
  const [escolhido, setEscolhido] = useState("");
  const id = escolhido || (records[0]?.exercise.id ?? "");
  const { data, isLoading } = useExerciseProgress(id);

  if (records.length === 0) return null;

  const pontos =
    data?.points.map((p) => ({ date: p.date, value: p.maxWeightKg })) ?? [];

  return (
    <section className="rounded-xl border bg-[var(--surface)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-[family-name:var(--font-display-face)] text-lg font-bold">
          Carga por exercício
        </h2>
        <label htmlFor="exercicio" className="sr-only">
          Escolher exercício
        </label>
        <select
          id="exercicio"
          value={id}
          onChange={(e) => setEscolhido(e.target.value)}
          className="min-h-11 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-sm text-[var(--text)] outline-none focus:border-[var(--muted-2)]"
        >
          {records.map((r) => (
            <option key={r.exercise.id} value={r.exercise.id}>
              {r.exercise.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <GraficoVazio />
      ) : pontos.length < 2 ? (
        <p className="py-12 text-center text-sm text-[var(--muted)]">
          Treine este exercício mais uma vez pra ver a linha.
        </p>
      ) : (
        <SeriesChart
          data={pontos}
          unidade="kg"
          rotulo="Carga máxima"
          descricao={descreveSerie(
            pontos,
            "kg",
            `carga máxima em ${data?.exercise.name ?? "exercício"}`,
          )}
          cor="var(--m-chest)"
        />
      )}
    </section>
  );
}

function PesoCorporal() {
  const { data: metrics, isLoading } = useMetrics();

  // A API devolve do mais recente pro mais antigo (pro `take` cortar o certo);
  // o grafico le ao contrario.
  const pontos =
    metrics
      ?.filter((m) => m.weightKg !== null)
      .map((m) => ({ date: m.date, value: m.weightKg }))
      .reverse() ?? [];
  const ultimoPeso = pontos.at(-1)?.value ?? null;

  return (
    <Secao
      titulo="Peso corporal"
      legenda={
        ultimoPeso !== null ? `${formataKg(ultimoPeso)} kg na última` : undefined
      }
    >
      <div className="mb-4">
        <WeightForm />
      </div>

      {isLoading ? (
        <GraficoVazio />
      ) : pontos.length < 2 ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">
          {pontos.length === 0
            ? "Registre seu peso pra começar a acompanhar."
            : "Mais uma pesagem e a linha aparece."}
        </p>
      ) : (
        <SeriesChart
          data={pontos}
          unidade="kg"
          rotulo="Peso"
          descricao={descreveSerie(pontos, "kg", "peso corporal")}
          cor="var(--m-shoulders)"
        />
      )}
    </Secao>
  );
}

function Recordes({ records }: { records: PersonalRecord[] }) {
  if (records.length === 0) return null;

  return (
    <Secao titulo="Recordes" legenda={String(records.length)}>
      <ul className="space-y-2">
        {records.map((r) => (
          <li
            key={r.exercise.id}
            className="flex items-center gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--bg)] p-3"
          >
            <Trophy
              size={16}
              className="shrink-0 text-[var(--m-shoulders)]"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.exercise.name}</p>
              {r.maxWeightDate ? (
                <p className="font-[family-name:var(--font-mono-face)] text-[10px] text-[var(--muted-2)]">
                  {formataData(r.maxWeightDate)}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <p className="font-[family-name:var(--font-display-face)] text-base font-bold text-[var(--chalk)]">
                {r.maxWeightKg !== null ? `${formataKg(r.maxWeightKg)} kg` : "—"}
              </p>
              {r.maxVolume !== null ? (
                <p className="font-[family-name:var(--font-mono-face)] text-[10px] text-[var(--muted-2)]">
                  {formataKg(Math.round(r.maxVolume))} kg vol.
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Secao>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-56 animate-pulse rounded-xl border bg-[var(--surface)]"
        />
      ))}
    </div>
  );
}

/**
 * O treino existe, a rede e que falhou.
 *
 * Mascote triste e nao dormindo: o `sleep` e a linguagem do "sem dados ainda", e
 * a diferenca entre os dois estados e justamente o que esta tela precisa dizer.
 */
function Erro({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <Mascot state="sad" size="md" />
      <p role="alert" className="text-sm text-[var(--muted)]">
        Não consegui carregar seu progresso. Seus treinos estão salvos.
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
        Nenhum treino encerrado ainda. Os gráficos aparecem depois do primeiro.
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
      <p className="text-[var(--muted)]">Entre para ver seu progresso.</p>
      <Link
        href="/login"
        className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[var(--chalk)] px-5 text-sm font-semibold text-black"
      >
        Entrar
      </Link>
    </div>
  );
}
