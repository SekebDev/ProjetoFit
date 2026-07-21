"use client";

import { useMemo, useState } from "react";
import { FlappyGame } from "@/components/games/FlappyGame";
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

/**
 * O minigame do descanso (Modo Dopamina). Se auto-gate no perfil: sem o modo
 * ligado, renderiza nada.
 *
 * Montado dentro do RestTimer, entao desmonta junto com ele quando o descanso
 * acaba (onDone) — o jogo nunca sobrevive ao fim do descanso.
 */
export function RestGame() {
  const { user } = useAuth();
  const { data: profile } = useProfile(!!user);
  const modoLigado = profile?.dopamineMode ?? false;
  const jogosHabilitados = profile?.dopamineGames ?? [];

  // Semente fixada uma vez por montagem (por descanso). Deriva o jogo de forma
  // pura: mesmo se o perfil revalidar no meio do descanso, a semente estavel
  // mantem o mesmo jogo — sem ref, sem efeito, sem re-sorteio a cada render.
  const [seed] = useState(() => Math.floor(Math.random() * 0xffffffff));
  const jogo = useMemo(
    () => (modoLigado ? pickDopamineGame(jogosHabilitados, rngFromSeed(seed)) : null),
    [modoLigado, jogosHabilitados, seed],
  );

  if (!modoLigado || !jogo) return null;

  return (
    <div data-testid="rest-game" className="mt-3">
      <p className="mb-1.5 font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted-2)]">
        Modo Dopamina · {GAME_LABELS[jogo]}
      </p>
      {jogo === "FLAPPY" ? <FlappyGame /> : <SnakeGame />}
    </div>
  );
}
