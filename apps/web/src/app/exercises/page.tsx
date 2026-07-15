"use client";

import { useEffect, useState } from "react";
import {
  EXERCISE_EQUIPMENT,
  type Exercise,
  type ExerciseFilter,
} from "@workout/shared";
import { ExerciseCard } from "@/components/ExerciseCard";
import { Mascot } from "@/components/Mascot";
import { useExercises } from "@/lib/hooks/useExercises";
import { EQUIP_LABELS, MUSCLE_META, MUSCLE_ORDER } from "@/lib/meta";
import { cn } from "@/lib/utils";

type Muscle = Exercise["muscleGroup"];
type Equip = Exercise["equipment"];

export default function ExercisesPage() {
  const [muscleGroup, setMuscleGroup] = useState<Muscle | undefined>();
  const [equipment, setEquipment] = useState<Equip | undefined>();
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(rawSearch.trim()), 250);
    return () => clearTimeout(t);
  }, [rawSearch]);

  const filter: ExerciseFilter = {
    muscleGroup,
    equipment,
    search: search || undefined,
  };
  const { data, isLoading, isError } = useExercises(filter);

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-6">
        <p className="font-[family-name:var(--font-mono-face)] text-xs uppercase tracking-[0.25em] text-[var(--muted-2)]">
          Biblioteca
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display-face)] text-3xl font-bold tracking-tight">
          Exercicios
        </h1>
      </div>

      <div className="sticky top-14 z-30 -mx-5 mb-6 space-y-3 border-b bg-[var(--bg)]/90 px-5 py-4 backdrop-blur">
        <input
          value={rawSearch}
          onChange={(e) => setRawSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className="w-full rounded-md border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted-2)] focus:border-[var(--muted)]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={!muscleGroup} onClick={() => setMuscleGroup(undefined)}>
            Todos
          </Chip>
          {MUSCLE_ORDER.map((g) => {
            const meta = MUSCLE_META[g];
            const active = muscleGroup === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setMuscleGroup(active ? undefined : g)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "text-black"
                    : "text-[var(--muted)] hover:text-[var(--text)]",
                )}
                style={
                  active
                    ? { background: meta.color, borderColor: meta.color }
                    : { borderColor: "var(--border)" }
                }
              >
                {meta.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-widest text-[var(--muted-2)]">
            Equip.
          </span>
          <Chip active={!equipment} onClick={() => setEquipment(undefined)}>
            Todos
          </Chip>
          {EXERCISE_EQUIPMENT.map((eq) => (
            <Chip
              key={eq}
              active={equipment === eq}
              onClick={() => setEquipment(equipment === eq ? undefined : eq)}
            >
              {EQUIP_LABELS[eq]}
            </Chip>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Grid>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] animate-pulse rounded-lg border bg-[var(--surface)]"
            />
          ))}
        </Grid>
      ) : isError ? (
        <p className="text-sm text-[var(--m-chest)]">
          Nao foi possivel carregar. A API esta no ar?
        </p>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Mascot state="sleep" size="md" />
          <p className="text-sm text-[var(--muted)]">
            Nenhum exercicio com esses filtros.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted)]">
            {data.length} exercicio{data.length === 1 ? "" : "s"}
          </p>
          <Grid>
            {data.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} />
            ))}
          </Grid>
        </>
      )}
    </main>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-[var(--chalk)] bg-[var(--chalk)] text-black"
          : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]",
      )}
    >
      {children}
    </button>
  );
}
