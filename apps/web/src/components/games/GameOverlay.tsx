"use client";

import { Minimize2, Minus, Plus, SkipForward } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface GameOverlayProps {
  /** Rótulo do jogo (ex.: "Flappy"), pro cabeçalho. */
  titulo: string;
  /** Tempo restante já formatado (mm:ss). */
  tempo: string;
  /** 0..1 pra barra de progresso. */
  progresso: number;
  onMenos: () => void;
  onMais: () => void;
  onPular: () => void;
  onMinimizar: () => void;
  children: React.ReactNode;
}

/**
 * Casca de tela cheia do minigame do descanso. Vive num portal no <body> pra
 * escapar do card do RestTimer e cobrir a viewport inteira (fake fullscreen com
 * CSS: a Fullscreen API exige gesto do usuário e o auto-abrir não tem um).
 *
 * O HUD no topo repete o cronômetro/atalhos do descanso — a fonte da verdade
 * continua no RestTimer, aqui só recebe por prop. Minimizar fecha o overlay sem
 * encerrar o descanso; Pular encerra (mesmo onDone de sempre).
 */
export function GameOverlay({
  titulo,
  tempo,
  progresso,
  onMenos,
  onMais,
  onPular,
  onMinimizar,
  children,
}: GameOverlayProps) {
  // Enquanto a tela cheia está aberta, trava scroll e overscroll do body — sem
  // isso, um swipe pra baixo no Snake pode disparar o pull-to-refresh do WebView
  // (SwipeRefreshLayout) e recarregar a página no meio do jogo.
  useEffect(() => {
    const { style } = document.body;
    const overflowAntes = style.overflow;
    const overscrollAntes = style.overscrollBehavior;
    style.overflow = "hidden";
    style.overscrollBehavior = "none";
    return () => {
      style.overflow = overflowAntes;
      style.overscrollBehavior = overscrollAntes;
    };
  }, []);

  // Só há portal no cliente (o overlay nunca é renderizado no servidor: mora
  // dentro do RestGame, que aparece após interação). Guarda contra SSR.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#0b1220] text-white"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingRight: "env(safe-area-inset-right)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
      }}
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-[0.2em] text-white/50">
            Modo Dopamina · {titulo}
          </p>
          <p className="font-[family-name:var(--font-mono-face)] text-2xl font-bold tabular-nums text-white">
            {tempo}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Tirar 15 segundos"
            onClick={onMenos}
            className="flex size-10 items-center justify-center rounded-md border border-white/15 text-white/70 transition-colors hover:text-white"
          >
            <Minus size={16} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Adicionar 15 segundos"
            onClick={onMais}
            className="flex size-10 items-center justify-center rounded-md border border-white/15 text-white/70 transition-colors hover:text-white"
          >
            <Plus size={16} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Minimizar o jogo"
            onClick={onMinimizar}
            className="flex size-10 items-center justify-center rounded-md border border-white/15 text-white/70 transition-colors hover:text-white"
          >
            <Minimize2 size={16} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onPular}
            className="flex min-h-10 items-center gap-1.5 rounded-md bg-white px-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            <SkipForward size={14} strokeWidth={2.5} aria-hidden />
            Pular
          </button>
        </div>
      </header>

      <div className="mx-4 h-1 shrink-0 overflow-hidden rounded-full bg-white/10">
        <div
          aria-hidden
          className="h-full origin-left rounded-full bg-[var(--m-shoulders)]"
          style={{ transform: `scaleX(${progresso})` }}
        />
      </div>

      {/* Área do jogo: o componente filho se posiciona em absolute inset-0.
          touch-none evita o browser roubar o gesto (scroll/zoom) do swipe. */}
      <div className="relative mt-2 min-h-0 flex-1 touch-none">{children}</div>
    </div>,
    document.body,
  );
}
