"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Exercise } from "@workout/shared";
import { useExercises } from "@/lib/hooks/useExercises";
import { MUSCLE_META, MUSCLE_ORDER } from "@/lib/meta";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (exercise: Exercise) => void;
}

/** Quantos resultados renderizar antes de exigir refino da busca. */
const MAX_VISIBLE = 60;

/**
 * Sheet de busca — ocupa a tela inteira no mobile e vira modal centrado no
 * desktop. Escolher um exercicio fecha o sheet.
 */
const FOCUSABLE = 'button, input, [href], [tabindex]:not([tabindex="-1"])';

export function ExercisePicker({ open, onClose, onPick }: Props) {
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState<Exercise["muscleGroup"] | undefined>();
  const dialogRef = useRef<HTMLDivElement>(null);
  const { data: exercises, isLoading } = useExercises({
    search: search.trim() ? search.trim() : undefined,
    muscleGroup: muscle,
  });

  const total = exercises?.length ?? 0;
  const visible = exercises?.slice(0, MAX_VISIBLE) ?? [];

  // Esc fecha, Tab fica preso no dialogo, e o body nao rola atras do sheet.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      // Sem isto o Tab escapa pra pagina atras: quem usa teclado ou leitor de
      // tela sai do modal sem fechar e perde a referencia de onde esta.
      const items = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items || items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Escolher exercício"
      className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)] sm:items-center sm:justify-center sm:bg-black/70 sm:p-6"
    >
      <div
        ref={dialogRef}
        className="flex h-full w-full flex-col sm:h-[80vh] sm:max-w-lg sm:rounded-2xl sm:border sm:bg-[var(--bg)]"
      >
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1">
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]"
            />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar exercício..."
              className="min-h-11 w-full rounded-md border bg-[var(--surface)] pl-9 pr-3 text-sm text-[var(--text)] placeholder:text-[var(--muted-2)] focus:border-[var(--muted)]"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-11 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)]"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto border-b px-4 py-2.5">
          <FilterChip
            label="Todos"
            active={!muscle}
            onClick={() => setMuscle(undefined)}
          />
          {MUSCLE_ORDER.map((m) => (
            <FilterChip
              key={m}
              label={MUSCLE_META[m].label}
              color={MUSCLE_META[m].color}
              active={muscle === m}
              onClick={() => setMuscle(muscle === m ? undefined : m)}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <ul className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <li
                  key={i}
                  className="h-14 animate-pulse rounded-lg bg-[var(--surface)]"
                />
              ))}
            </ul>
          ) : total === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--muted)]">
              Nenhum exercício encontrado.
            </p>
          ) : (
            <ul className="divide-y">
              {visible.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(ex);
                      onClose();
                    }}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface)]"
                  >
                    <span
                      aria-hidden
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ background: MUSCLE_META[ex.muscleGroup].color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {ex.name}
                      </span>
                      <span className="block font-[family-name:var(--font-mono-face)] text-[11px] text-[var(--muted-2)]">
                        {MUSCLE_META[ex.muscleGroup].label}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {total > MAX_VISIBLE ? (
                // Truncar em silencio faz o usuario rolar ate o fim e concluir
                // que acabou, quando na verdade ainda ha centenas.
                <li className="px-4 py-4 text-center font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted-2)]">
                  Mostrando {MAX_VISIBLE} de {total}. Refine a busca.
                </li>
              ) : null}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-[var(--chalk)] bg-[var(--chalk)] text-black"
          : "border-[var(--border)] text-[var(--muted)]",
      )}
      style={
        active && color ? { background: color, borderColor: color } : undefined
      }
    >
      {label}
    </button>
  );
}
