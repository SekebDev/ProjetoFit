"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LastLoad, PlanExercise, SetLog } from "@workout/shared";
import { RestTimer } from "@/components/RestTimer";
import { useRackie } from "@/components/rackie/RackieProvider";
import { useLogSet } from "@/lib/hooks/useSessions";
import { isPersonalRecord } from "@/lib/rackie/pr";
import { cn, numOrNull } from "@/lib/utils";

/** Escala RPE: 5 a 10, de meio em meio (o schema recusa 7.3). */
const RPES = Array.from({ length: 11 }, (_, i) => 5 + i * 0.5);

/** Quanto o pulso de confirmacao da serie dura na tela. */
const PULSO_MS = 400;

/**
 * Vibra de leve ao registrar a serie — PR ganha um padrao mais empolgado.
 * Degrada em silencio como o RestTimer: iOS Safari nao implementa vibrate.
 */
function vibra(isPr: boolean): void {
  try {
    navigator.vibrate?.(isPr ? [40, 40, 80] : 30);
  } catch {
    // Sem vibracao: o pulso visual ja cobre.
  }
}

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
  const rackie = useRackie();
  // Anima o descanso e o erro entrando/saindo do card sem keyframe manual.
  const [cardRef] = useAutoAnimate<HTMLLIElement>();
  const { exercise } = planExercise;
  const cor = COR_MUSCULO[exercise.muscleGroup] ?? "var(--muted)";

  // Numero da serie que acabou de ser registrada, pra dar o pulso so nela.
  const [recemFeita, setRecemFeita] = useState<number | null>(null);
  const pulsoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pulsoTimer.current) clearTimeout(pulsoTimer.current);
    };
  }, []);

  const numeros = Array.from({ length: planExercise.sets }, (_, i) => i + 1);
  const feitas = logs.length;

  /**
   * O momento satisfatorio: a serie entrou. Pulso na linha, vibracao, e a
   * Rackie solta uma frase — comemoracao de PR se bateu a ultima carga, zoacao
   * de sempre se foi serie comum.
   */
  function celebra(numero: number, isPr: boolean): void {
    rackie.say(isPr ? "pr" : "set");
    vibra(isPr);
    setRecemFeita(numero);
    if (pulsoTimer.current) clearTimeout(pulsoTimer.current);
    pulsoTimer.current = setTimeout(
      () => setRecemFeita((atual) => (atual === numero ? null : atual)),
      PULSO_MS,
    );
  }

  return (
    <li ref={cardRef} className="rounded-xl border bg-[var(--surface)] p-4">
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
            pulsando={recemFeita === n}
            onRegistrar={(peso, reps, rpe) => {
              // Calcula o PR com a carga antes do mutate: o cache muda no sucesso
              // e a "ultima carga" desta sessao passaria a ser a propria serie.
              const isPr = isPersonalRecord(peso, reps, lastLoad);
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
                  onSuccess: () => {
                    // Descanso so entre series — depois da ultima nao faz sentido.
                    if (n < planExercise.sets) setDescansando(true);
                    celebra(n, isPr);
                  },
                },
              );
            }}
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
  /** True no instante em que a serie foi registrada, pra disparar o pulso. */
  pulsando: boolean;
  onRegistrar: (
    peso: number | null,
    reps: number | null,
    rpe: number | null,
  ) => void;
}

function SetRow({
  numero,
  log,
  lastLoad,
  disabled,
  pulsando,
  onRegistrar,
}: SetRowProps) {
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
        pulsando && "set-pop",
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
