"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createFlappy,
  FLAPPY,
  flap,
  type FlappyState,
  stepFlappy,
} from "@/lib/games/flappy";

// Abertura do proximo cano entre 25% e 75% da altura — nunca colada nas bordas.
const randomGap = () => FLAPPY.world * 0.25 + Math.random() * FLAPPY.world * 0.5;

// Trava o passo maximo: se a aba dormiu (celular no bolso), o dt gigante nao
// pode teletransportar o passaro pra dentro de um cano. Melhor um "pulo" curto.
const MAX_DT = 50;

const CANVAS_W = 300;
const CANVAS_H = 180;

function draw(ctx: CanvasRenderingContext2D, s: FlappyState): void {
  const sx = CANVAS_W / FLAPPY.world;
  const sy = CANVAS_H / FLAPPY.world;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.fillStyle = "#22c55e";
  const half = FLAPPY.gapHeight / 2;
  for (const p of s.pipes) {
    const x = p.x * sx;
    const w = FLAPPY.pipeWidth * sx;
    ctx.fillRect(x, 0, w, (p.gapY - half) * sy);
    const abaixo = (p.gapY + half) * sy;
    ctx.fillRect(x, abaixo, w, CANVAS_H - abaixo);
  }

  ctx.fillStyle = s.dead ? "#ef4444" : "#eab308";
  ctx.beginPath();
  ctx.arc(
    FLAPPY.birdX * sx,
    s.birdY * sy,
    FLAPPY.birdRadius * sx,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

export function FlappyGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<FlappyState>(createFlappy(randomGap));
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);

  const acao = useCallback(() => {
    if (stateRef.current.dead) {
      stateRef.current = createFlappy(randomGap);
      setScore(0);
      setDead(false);
      return;
    }
    stateRef.current = flap(stateRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(now - last, MAX_DT);
      last = now;
      const proximo = stepFlappy(stateRef.current, dt, randomGap);
      stateRef.current = proximo;
      draw(ctx, proximo);
      setScore(proximo.score);
      setDead(proximo.dead);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        acao();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [acao]);

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        acao();
      }}
      aria-label={
        dead ? "Flappy: fim de jogo, toque para recomeçar" : "Flappy: toque para subir"
      }
      className="relative block w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[#0b1220] touch-none"
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="block w-full"
      />
      <span className="pointer-events-none absolute right-2 top-1.5 font-[family-name:var(--font-mono-face)] text-sm font-bold tabular-nums text-white">
        {score}
      </span>
      {dead ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold text-white/90">
          toque para recomeçar
        </span>
      ) : null}
    </button>
  );
}
