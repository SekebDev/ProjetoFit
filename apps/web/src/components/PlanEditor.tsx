"use client";

import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { CreatePlanInput, Exercise, Plan } from "@workout/shared";
import { MAX_DAYS_PER_PLAN, PlanExerciseInputSchema } from "@workout/shared";
import { ExercisePicker } from "@/components/ExercisePicker";
import { MUSCLE_META } from "@/lib/meta";
import { cn } from "@/lib/utils";

const DEFAULT_SETS = 3;
const DEFAULT_REP_SCHEME = "8-12";

interface DraftExercise {
  key: string;
  exercise: Exercise;
  sets: number;
  repScheme: string;
  restSec: number;
}

interface DraftDay {
  key: string;
  name: string;
  focus: string;
  exercises: DraftExercise[];
}

interface Props {
  initial?: Plan | null;
  onSubmit: (input: CreatePlanInput) => void;
  saving: boolean;
  error?: string | null;
  submitLabel: string;
}

/** Chave estavel de lista — indice quebraria o estado ao remover no meio. */
function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const CAMPO_LABEL: Record<string, string> = {
  sets: "séries",
  repScheme: "reps",
  restSec: "descanso",
};

/**
 * Primeiro problema do rascunho, em portugues, ou null se esta tudo certo.
 *
 * Valida com o MESMO schema que o servidor usa: reescrever as regras aqui
 * garantiria que uma hora as duas versoes divergem. Sem isto o submit ia com
 * sets=0 e voltava um "Dados invalidos" que nao dizia qual campo.
 */
function primeiroProblema(days: DraftDay[]): string | null {
  if (days.some((d) => d.exercises.length === 0)) {
    return "Todo dia precisa de pelo menos um exercício.";
  }
  for (const day of days) {
    for (const ex of day.exercises) {
      const res = PlanExerciseInputSchema.safeParse({
        exerciseId: ex.exercise.id,
        sets: ex.sets,
        repScheme: ex.repScheme,
        restSec: ex.restSec,
        notes: null,
      });
      if (!res.success) {
        const issue = res.error.issues[0];
        const campo = CAMPO_LABEL[String(issue.path[0])] ?? String(issue.path[0]);
        return `${day.name || "Dia"} · ${ex.exercise.name}: confira ${campo}.`;
      }
    }
  }
  return null;
}

function emptyDay(index: number): DraftDay {
  return { key: uid(), name: `Dia ${index + 1}`, focus: "", exercises: [] };
}

/** Plan (servidor) -> rascunho local. */
function toDraft(plan: Plan): DraftDay[] {
  return plan.days.map((day) => ({
    key: day.id,
    name: day.name,
    focus: day.focus ?? "",
    exercises: day.exercises.map((pe) => ({
      key: pe.id,
      exercise: pe.exercise,
      sets: pe.sets,
      repScheme: pe.repScheme,
      restSec: pe.restSec,
    })),
  }));
}

export function PlanEditor({
  initial,
  onSubmit,
  saving,
  error,
  submitLabel,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [firstDays] = useState<DraftDay[]>(() =>
    initial ? toDraft(initial) : [emptyDay(0)],
  );
  const [days, setDays] = useState<DraftDay[]>(firstDays);
  // Plano novo abre ja no primeiro dia; edicao comeca tudo fechado pra dar visao geral.
  const [openKey, setOpenKey] = useState<string | null>(
    initial ? null : (firstDays[0]?.key ?? null),
  );
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const problema = primeiroProblema(days);
  const canSubmit = name.trim().length > 0 && days.length > 0 && !problema;

  function patchDay(key: string, patch: Partial<DraftDay>): void {
    setDays((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function addExercise(dayKey: string, exercise: Exercise): void {
    setDays((prev) =>
      prev.map((d) =>
        d.key === dayKey
          ? {
              ...d,
              exercises: [
                ...d.exercises,
                {
                  key: uid(),
                  exercise,
                  sets: DEFAULT_SETS,
                  repScheme: DEFAULT_REP_SCHEME,
                  // O descanso ja vem calibrado por exercicio, vindo do seed.
                  restSec: exercise.defaultRestSec,
                },
              ],
            }
          : d,
      ),
    );
  }

  function patchExercise(
    dayKey: string,
    exKey: string,
    patch: Partial<DraftExercise>,
  ): void {
    setDays((prev) =>
      prev.map((d) =>
        d.key === dayKey
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.key === exKey ? { ...e, ...patch } : e,
              ),
            }
          : d,
      ),
    );
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      notes: notes.trim() || null,
      days: days.map((d) => ({
        name: d.name.trim(),
        focus: d.focus.trim() || null,
        exercises: d.exercises.map((ex) => ({
          exerciseId: ex.exercise.id,
          sets: ex.sets,
          repScheme: ex.repScheme,
          restSec: ex.restSec,
          notes: null,
        })),
      })),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Field label="Nome do plano">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Push / Pull / Legs"
            className="min-h-11 w-full rounded-md border bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--muted-2)] focus:border-[var(--muted)]"
          />
        </Field>
        <Field label="Observações">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ex.: 4x por semana, deload a cada 6 semanas"
            className="w-full rounded-md border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted-2)] focus:border-[var(--muted)]"
          />
        </Field>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <span className="font-[family-name:var(--font-mono-face)] text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
            Dias
          </span>
          <span className="font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted-2)]">
            {days.length}/{MAX_DAYS_PER_PLAN}
          </span>
        </div>

        {days.map((day, index) => (
          <DayCard
            key={day.key}
            day={day}
            index={index}
            open={openKey === day.key}
            onToggle={() => setOpenKey(openKey === day.key ? null : day.key)}
            onPatch={(patch) => patchDay(day.key, patch)}
            onRemove={() =>
              setDays((prev) => prev.filter((d) => d.key !== day.key))
            }
            onAddExercise={() => setPickerFor(day.key)}
            onPatchExercise={(exKey, patch) =>
              patchExercise(day.key, exKey, patch)
            }
            onRemoveExercise={(exKey) =>
              patchDay(day.key, {
                exercises: day.exercises.filter((e) => e.key !== exKey),
              })
            }
          />
        ))}

        {days.length < MAX_DAYS_PER_PLAN ? (
          <button
            type="button"
            onClick={() =>
              setDays((prev) => {
                const next = emptyDay(prev.length);
                setOpenKey(next.key);
                return [...prev, next];
              })
            }
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm text-[var(--muted)] transition-colors hover:border-[var(--muted-2)] hover:text-[var(--text)]"
          >
            <Plus size={15} aria-hidden />
            Adicionar dia
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md border border-[var(--m-chest)]/40 bg-[var(--m-chest)]/10 px-3 py-2 text-sm text-[var(--m-chest)]">
          {error}
        </p>
      ) : null}

      {problema ? (
        <p className="font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted-2)]">
          {problema}
        </p>
      ) : null}

      {/* No mobile o botao gruda logo acima da bottom-tab. */}
      <div className="sticky bottom-[var(--bottom-nav-space)] z-10 -mx-5 border-t bg-[var(--bg)]/95 px-5 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
        <button
          type="submit"
          disabled={saving || !canSubmit}
          className="min-h-12 w-full rounded-md bg-[var(--chalk)] text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto sm:px-6"
        >
          {saving ? "Salvando..." : submitLabel}
        </button>
      </div>

      {/* key por dia: remonta o sheet a cada abertura, entao a busca comeca
          limpa em vez de herdar o filtro da vez anterior. */}
      <ExercisePicker
        key={pickerFor ?? "fechado"}
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onPick={(exercise) => {
          if (pickerFor) addExercise(pickerFor, exercise);
        }}
      />
    </form>
  );
}

function DayCard({
  day,
  index,
  open,
  onToggle,
  onPatch,
  onRemove,
  onAddExercise,
  onPatchExercise,
  onRemoveExercise,
}: {
  day: DraftDay;
  index: number;
  open: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<DraftDay>) => void;
  onRemove: () => void;
  onAddExercise: () => void;
  onPatchExercise: (exKey: string, patch: Partial<DraftExercise>) => void;
  onRemoveExercise: (exKey: string) => void;
}) {
  const count = day.exercises.length;
  return (
    <div className="overflow-hidden rounded-lg border bg-[var(--surface)]">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-h-14 flex-1 items-center gap-3 px-4 text-left"
        >
          <span className="font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted-2)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {day.name || "Sem nome"}
            </span>
            <span className="block font-[family-name:var(--font-mono-face)] text-[11px] text-[var(--muted-2)]">
              {count === 0
                ? "vazio"
                : `${count} exercício${count > 1 ? "s" : ""}`}
            </span>
          </span>
          <ChevronDown
            size={16}
            aria-hidden
            className={cn(
              "shrink-0 text-[var(--muted-2)] transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remover ${day.name}`}
          className="flex size-11 shrink-0 items-center justify-center text-[var(--muted-2)] transition-colors hover:text-[var(--m-chest)]"
        >
          <Trash2 size={15} aria-hidden />
        </button>
      </div>

      {open ? (
        <div className="space-y-3 border-t px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={day.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              placeholder="Push"
              aria-label="Nome do dia"
              className="min-h-11 rounded-md border bg-[var(--surface-2)] px-3 text-sm focus:border-[var(--muted)]"
            />
            <input
              value={day.focus}
              onChange={(e) => onPatch({ focus: e.target.value })}
              placeholder="Foco (opcional)"
              aria-label="Foco do dia"
              className="min-h-11 rounded-md border bg-[var(--surface-2)] px-3 text-sm focus:border-[var(--muted)]"
            />
          </div>

          {day.exercises.map((ex) => (
            <ExerciseRow
              key={ex.key}
              draft={ex}
              onPatch={(patch) => onPatchExercise(ex.key, patch)}
              onRemove={() => onRemoveExercise(ex.key)}
            />
          ))}

          <button
            type="button"
            onClick={onAddExercise}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-dashed text-xs text-[var(--muted)] transition-colors hover:border-[var(--muted-2)] hover:text-[var(--text)]"
          >
            <Plus size={14} aria-hidden />
            Adicionar exercício
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ExerciseRow({
  draft,
  onPatch,
  onRemove,
}: {
  draft: DraftExercise;
  onPatch: (patch: Partial<DraftExercise>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-md border bg-[var(--surface-2)] p-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-6 w-1 shrink-0 rounded-full"
          style={{ background: MUSCLE_META[draft.exercise.muscleGroup].color }}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {draft.exercise.name}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remover ${draft.exercise.name}`}
          className="flex size-9 shrink-0 items-center justify-center rounded text-[var(--muted-2)] hover:text-[var(--m-chest)]"
        >
          <Trash2 size={14} aria-hidden />
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <MiniField label="Séries">
          <input
            inputMode="numeric"
            value={draft.sets}
            onChange={(e) => onPatch({ sets: Number(e.target.value) || 0 })}
            className="min-h-10 w-full rounded border bg-[var(--surface)] px-2 text-center font-[family-name:var(--font-mono-face)] text-sm tabular-nums focus:border-[var(--muted)]"
          />
        </MiniField>
        <MiniField label="Reps">
          <input
            value={draft.repScheme}
            onChange={(e) => onPatch({ repScheme: e.target.value })}
            placeholder="8-12"
            className="min-h-10 w-full rounded border bg-[var(--surface)] px-2 text-center font-[family-name:var(--font-mono-face)] text-sm focus:border-[var(--muted)]"
          />
        </MiniField>
        <MiniField label="Descanso">
          <input
            inputMode="numeric"
            value={draft.restSec}
            onChange={(e) => onPatch({ restSec: Number(e.target.value) || 0 })}
            className="min-h-10 w-full rounded border bg-[var(--surface)] px-2 text-center font-[family-name:var(--font-mono-face)] text-sm tabular-nums focus:border-[var(--muted)]"
          />
        </MiniField>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block font-[family-name:var(--font-mono-face)] text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function MiniField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-center font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-wider text-[var(--muted-2)]">
        {label}
      </span>
      {children}
    </label>
  );
}
