"use client";

import { Minus, Plus, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RestGame } from "@/components/games/RestGame";

const AJUSTE_MS = 15_000;
/** So repinta a tela; quem conta o tempo e o relogio do sistema. */
const REPINTA_MS = 250;

interface RestTimerProps {
  /** Descanso prescrito, de PlanExercise.restSec. */
  seconds: number;
  onDone: () => void;
}

function formata(totalSec: number): string {
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

/**
 * Avisa que o descanso acabou. Tudo aqui degrada em silencio de proposito:
 * iOS Safari nao implementa vibrate, o Notification exige permissao concedida,
 * e no Chrome mobile o construtor de Notification lanca. Nenhum desses casos
 * pode derrubar o timer — o contador na tela ja e o aviso principal.
 */
function avisa(): void {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // Sem vibracao: o visual ja cobre.
  }
  try {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      new Notification("Descanso concluído", {
        body: "Bora para a próxima série.",
      });
    }
  } catch {
    // Sem notificacao: idem.
  }
}

export function RestTimer({ seconds, onDone }: RestTimerProps) {
  // O prazo e um instante absoluto, nao um contador que decrementa: se a aba
  // dormir (que e o caso comum — o celular no bolso durante o descanso), o
  // setInterval atrasa, mas `prazo - agora` continua certo ao acordar.
  const [prazo, setPrazo] = useState(() => Date.now() + seconds * 1000);
  const [agora, setAgora] = useState(() => Date.now());
  const jaAvisou = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), REPINTA_MS);
    return () => clearInterval(id);
  }, []);

  // Pede permissao uma vez. Vem logo depois do toque que concluiu a serie,
  // entao ainda conta como gesto do usuario nos browsers que exigem isso.
  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {
        // Usuario negou ou o browser bloqueou: segue sem notificacao.
      });
    }
  }, []);

  const restanteMs = Math.max(0, prazo - agora);
  const restanteSec = Math.ceil(restanteMs / 1000);
  const acabou = restanteMs === 0;

  useEffect(() => {
    if (acabou && !jaAvisou.current) {
      jaAvisou.current = true;
      avisa();
      onDone();
    }
  }, [acabou, onDone]);

  const progresso = seconds > 0 ? restanteMs / (seconds * 1000) : 0;

  return (
    <div className="rounded-xl border border-[var(--m-shoulders)]/40 bg-[var(--surface-2)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted-2)]">
            Descanso
          </p>
          {/* aria-live off: anunciar cada segundo entupiria o leitor de tela.
              O fim do descanso e anunciado pelo role=status la embaixo. */}
          <p
            role="timer"
            aria-live="off"
            className="font-[family-name:var(--font-mono-face)] text-3xl font-bold tabular-nums text-[var(--chalk)]"
          >
            {formata(restanteSec)}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Tirar 15 segundos"
            onClick={() => setPrazo((p) => Math.max(Date.now(), p - AJUSTE_MS))}
            className="flex size-11 items-center justify-center rounded-md border text-[var(--muted)] transition-colors hover:border-[var(--muted-2)] hover:text-[var(--text)]"
          >
            <Minus size={16} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Adicionar 15 segundos"
            onClick={() => setPrazo((p) => p + AJUSTE_MS)}
            className="flex size-11 items-center justify-center rounded-md border text-[var(--muted)] transition-colors hover:border-[var(--muted-2)] hover:text-[var(--text)]"
          >
            <Plus size={16} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onDone}
            className="flex min-h-11 items-center gap-1.5 rounded-md bg-[var(--chalk)] px-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            <SkipForward size={14} strokeWidth={2.5} aria-hidden />
            Pular
          </button>
        </div>
      </div>

      {/* scaleX em vez de width: fica no compositor e nao dispara layout. */}
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          aria-hidden
          className="h-full origin-left rounded-full bg-[var(--m-shoulders)]"
          style={{ transform: `scaleX(${progresso})` }}
        />
      </div>

      {acabou ? (
        <p role="status" className="mt-2 text-xs text-[var(--m-legs)]">
          Descanso concluído.
        </p>
      ) : null}

      {/* Modo Dopamina: aparece so se o perfil ligou. Vive dentro do RestTimer,
          entao some junto quando o descanso acaba e o timer desmonta. Abre em
          tela cheia (GameOverlay); o HUD reflete este mesmo cronometro. */}
      <RestGame
        tempo={formata(restanteSec)}
        progresso={progresso}
        onMenos={() => setPrazo((p) => Math.max(Date.now(), p - AJUSTE_MS))}
        onMais={() => setPrazo((p) => p + AJUSTE_MS)}
        onPular={onDone}
      />
    </div>
  );
}
