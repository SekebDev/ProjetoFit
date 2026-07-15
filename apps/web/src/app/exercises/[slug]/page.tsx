"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useExercise } from "@/lib/hooks/useExercises";
import { CATEGORY_LABELS, EQUIP_LABELS, MUSCLE_META } from "@/lib/meta";

export default function ExerciseDetailPage() {
  const params = useParams<{ slug: string }>();
  const { data: ex, isLoading, isError } = useExercise(params.slug);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="h-[420px] animate-pulse rounded-xl border bg-[var(--surface)]" />
      </main>
    );
  }
  if (isError || !ex) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 text-center">
        <p className="text-[var(--muted)]">Exercicio nao encontrado.</p>
        <Link
          href="/exercises"
          className="mt-4 inline-block text-sm text-[var(--chalk)] underline"
        >
          Voltar a biblioteca
        </Link>
      </main>
    );
  }

  const m = MUSCLE_META[ex.muscleGroup];
  const steps = (ex.instructions ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <Link
        href="/exercises"
        className="font-[family-name:var(--font-mono-face)] text-xs uppercase tracking-widest text-[var(--muted)] hover:text-[var(--text)]"
      >
        &larr; Biblioteca
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-white">
          {ex.imageUrl ? (
            <Image
              src={ex.imageUrl}
              alt={ex.name}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 500px"
              className="object-cover"
            />
          ) : null}
          <span
            aria-hidden
            className="absolute left-0 top-0 h-full w-1.5"
            style={{ background: m.color }}
          />
        </div>

        <div>
          <span
            className="inline-flex items-center rounded-md px-2.5 py-1 font-[family-name:var(--font-mono-face)] text-[11px] font-medium uppercase tracking-widest text-black"
            style={{ background: m.color }}
          >
            {m.label}
          </span>
          <h1 className="mt-3 font-[family-name:var(--font-display-face)] text-3xl font-bold leading-tight tracking-tight">
            {ex.name}
          </h1>

          <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-[var(--border)]">
            <Spec label="Equipamento" value={EQUIP_LABELS[ex.equipment]} />
            <Spec label="Tipo" value={CATEGORY_LABELS[ex.category]} />
            <Spec label="Descanso" value={ex.defaultRestSec + "s"} mono />
          </dl>
        </div>
      </div>

      {steps.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-mono-face)] text-xs uppercase tracking-[0.25em] text-[var(--muted-2)]">
            Execucao
          </h2>
          <ol className="mt-4 space-y-4">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span
                  className="mt-0.5 font-[family-name:var(--font-mono-face)] text-sm font-medium tabular-nums"
                  style={{ color: m.color }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-sm leading-relaxed text-[var(--text)]">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </main>
  );
}

function Spec({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-[var(--surface)] p-3">
      <dt className="font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-widest text-[var(--muted-2)]">
        {label}
      </dt>
      <dd
        className={
          "mt-1 text-sm text-[var(--text)]" +
          (mono ? " font-[family-name:var(--font-mono-face)] tabular-nums" : "")
        }
      >
        {value}
      </dd>
    </div>
  );
}
