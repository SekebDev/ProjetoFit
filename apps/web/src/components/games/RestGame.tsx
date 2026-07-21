"use client";

import { useMemo, useState } from "react";
import { FlappyGame } from "@/components/games/FlappyGame";
import { GameOverlay } from "@/components/games/GameOverlay";
import { SnakeGame } from "@/components/games/SnakeGame";
import { useAuth } from "@/lib/auth";
import { GAME_LABELS, pickDopamineGame } from "@/lib/games/registry";
import { useProfile } from "@/lib/hooks/useProfile";

/** rng deterministico a partir de uma semente (mulberry32). */
function rngFromSeed(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface RestGameProps {
  /** Tempo restante já formatado (mm:ss), pro HUD do overlay. */
  tempo: string;
  /** 0..1 pra barra de progresso do HUD. */
  progresso: number;
  onMenos: () => void;
  onMais: () => void;
  onPular: () => void;
}

/**
 * O minigame do descanso (Modo Dopamina). Auto-gate no perfil: sem o modo
 * ligado, renderiza nada.
 *
 * Abre em tela cheia automaticamente (GameOverlay via portal). Minimizar fecha
 * o overlay sem encerrar o descanso — o card do RestTimer reaparece com um botão
 * pra voltar ao jogo. Montado dentro do RestTimer, então desmonta junto quando o
 * descanso acaba (onDone) — o jogo nunca sobrevive ao fim do descanso.
 */
export function RestGame({ tempo, progresso, onMenos, onMais, onPular }: RestGameProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile(!!user);
  const modoLigado = profile?.dopamineMode ?? false;
  // Referência direta do cache (estável entre renders); o fallback [] fica dentro
  // do useMemo pra não recriar array a cada render e desestabilizar as deps.
  const jogosHabilitados = profile?.dopamineGames;

  // Semente fixada uma vez por montagem (por descanso). Deriva o jogo de forma
  // pura: mesmo se o perfil revalidar no meio do descanso, a semente estavel
  // mantem o mesmo jogo — sem ref, sem efeito, sem re-sorteio a cada render.
  const [seed] = useState(() => Math.floor(Math.random() * 0xffffffff));
  const jogo = useMemo(
    () => (modoLigado ? pickDopamineGame(jogosHabilitados ?? [], rngFromSeed(seed)) : null),
    [modoLigado, jogosHabilitados, seed],
  );

  // Auto-abre em tela cheia; minimizar volta pro card sem encerrar o descanso.
  const [aberto, setAberto] = useState(true);

  if (!modoLigado || !jogo) return null;

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] py-2.5 text-sm font-semibold text-[var(--muted)] transition-colors hover:text-[var(--text)]"
      >
        ▶ Jogar {GAME_LABELS[jogo]} em tela cheia
      </button>
    );
  }

  return (
    <GameOverlay
      titulo={GAME_LABELS[jogo]}
      tempo={tempo}
      progresso={progresso}
      onMenos={onMenos}
      onMais={onMais}
      onPular={onPular}
      onMinimizar={() => setAberto(false)}
    >
      {jogo === "FLAPPY" ? <FlappyGame /> : <SnakeGame />}
    </GameOverlay>
  );
}
