"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import type { LastLoad, PlanExercise, SetLog } from "@workout/shared";
import { RestTimer } from "@/components/RestTimer";
import { useLogSet } from "@/lib/hooks/useSessions";
import { cn, numOrNull } from "@/lib/utils";

/** Escala RPE: 5 a 10, de meio em meio (o schema recusa 7.3). */
const RPES = Array.from({ length: 11 }, (_, i) => 5 + i * 0.5);

const COR_MUSCULO: Record<string, string> = {
  CHEST: "var(--m-chest)",
  BACK: "var(--m-back)",
  SHOULDERS: "var(--m-shoulders)",
  ARMS: "var(--m-arms)",
  LEGS: "var(--m-legs)",
  CORE: "var(--m-core)",
};

interface SetLoggerProps {
  planExercise: PlanExercise;
  sessionId: string;
  planDayId: string;
  /** Ultima carga deste exercicio, de um treino ja encerrado. */
  lastLoad: LastLoad | undefined;
  /** Series ja registradas nesta sessao, deste exercicio. */
  logs: SetLog[];
  disabled: boolean;
}

export function SetLogger({
  planExercise,
  sessionId,
  planDayId,
  lastLoad,
  logs,
  disabled,
}: SetLoggerProps) {
  const [descansando, setDescansando] = useState(false);
  const logSet = useLogSet(sessionId, planDayId);
  const { exercise } = planExercise;
  const cor = COR_MUSCULO[exercise.muscleGroup] ?? "var(--muted)";

  const numeros = Array.from({ length: planExercise.sets }, (_, i) => i + 1);
  const feitas = logs.length;

  return (
    <li className="rounded-xl border bg-[var(--surface)] p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: cor }}
            />
            <h2 className="truncate font-[family-name:var(--font-display-face)] text-base font-bold">
              {exercise.name}
            </h2>
          </div>
          <p className="mt-1 font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted-2)]">
            {planExercise.sets} × {planExercise.repScheme} ·{" "}
            {planExercise.restSec}s
          </p>
        </div>
        <span className="shrink-0 font-[family-name:var(--font-mono-face)] text-xs tabular-nums text-[var(--muted-2)]">
          {feitas}/{planExercise.sets}
        </span>
      </header>

      {lastLoad ? (
        <p className="mt-2 font-[family-name:var(--font-mono-face)] text-[11px] text-[var(--muted)]">
          Última vez: {lastLoad.weightKg ?? "—"} kg × {lastLoad.reps ?? "—"}
        </p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {numeros.map((n) => (
          <SetRow
            key={n}
            numero={n}
            log={logs.find((l) => l.setNumber === n)}
            lastLoad={lastLoad}
            disabled={disabled || logSet.isPending}
            onRegistrar={(peso, reps, rpe) =>
              logSet.mutate(
                {
                  exerciseId: exercise.id,
                  setNumber: n,
                  weightKg: peso,
                  reps,
                  rpe,
                  completed: true,
                },
                {
                  // Descanso so entre series — depois da ultima nao faz sentido.
                  onSuccess: () => {
                    if (n < planExercise.sets) setDescansando(true);
                  },
                },
              )
            }
          />
        ))}
      </ul>

      {logSet.isError ? (
        <p role="alert" className="mt-2 text-xs text-[var(--m-chest)]">
          {logSet.error.message}
        </p>
      ) : null}

      {descansando ? (
        <div className="mt-3">
          <RestTimer
            seconds={planExercise.restSec}
            onDone={() => setDescansando(false)}
          />
        </div>
      ) : null}
    </li>
  );
}

interface SetRowProps {
  numero: number;
  log: SetLog | undefined;
  lastLoad: LastLoad | undefined;
  disabled: boolean;
  onRegistrar: (
    peso: number | null,
    reps: number | null,
    rpe: number | null,
  ) => void;
}

function SetRow({ numero, log, lastLoad, disabled, onRegistrar }: SetRowProps) {
  // Pre-preenche com o que ja foi registrado nesta sessao; senao, com a carga
  // da ultima vez. E o que faz "bater o registro anterior" virar so apertar ok.
  const [peso, setPeso] = useState(() =>
    String(log?.weightKg ?? lastLoad?.weightKg ?? ""),
  );
  const [reps, setReps] = useState(() =>
    String(log?.reps ?? lastLoad?.reps ?? ""),
  );
  const [rpe, setRpe] = useState(() => String(log?.rpe ?? ""));

  const registrado = Boolean(log);
  const campo =
    "min-h-11 w-full rounded-md border bg-[var(--surface-2)] px-2 text-center text-sm tabular-nums focus:border-[var(--chalk)] focus:outline-none";

  return (
    <li
      className={cn(
        "grid grid-cols-[1.25rem_1fr_1fr_3.75rem_2.75rem] items-center gap-1.5 rounded-md",
        registrado && "bg-[var(--m-legs)]/10",
      )}
    >
      <span className="font-[family-name:var(--font-mono-face)] text-xs tabular-nums text-[var(--muted-2)]">
        {numero}
      </span>

      <input
        type="text"
        inputMode="decimal"
        placeholder="kg"
        aria-label={`Carga da série ${numero} em kg`}
        value={peso}
        onChange={(e) => setPeso(e.target.value)}
        className={campo}
      />
      <input
        type="text"
        inputMode="numeric"
        placeholder="reps"
        aria-label={`Repetições da série ${numero}`}
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        className={campo}
      />
      <select
        aria-label={`RPE da série ${numero}`}
        value={rpe}
        onChange={(e) => setRpe(e.target.value)}
        className={cn(campo, "px-1")}
      >
        <option value="">RPE</option>
        {RPES.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={disabled}
        aria-label={
          registrado ? `Atualizar série ${numero}` : `Registrar série ${numero}`
        }
        onClick={() =>
          onRegistrar(numOrNull(peso), numOrNull(reps), numOrNull(rpe))
        }
        className={cn(
          "flex size-11 items-center justify-center rounded-md border transition-colors disabled:opacity-40",
          registrado
            ? "border-[var(--m-legs)] bg-[var(--m-legs)]/20 text-[var(--m-legs)]"
            : "text-[var(--muted-2)] hover:border-[var(--muted-2)] hover:text-[var(--text)]",
        )}
      >
        <Check size={16} strokeWidth={registrado ? 3 : 2} aria-hidden />
      </button>
    </li>
  );
}
