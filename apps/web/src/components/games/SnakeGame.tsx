"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSnake,
  type Dir,
  type SnakeState,
  stepSnake,
  turn,
} from "@/lib/games/snake";

const COLS = 15;
const ROWS = 15;
const TICK_MS = 140;
const CANVAS = 210; // quadrado; cada celula = CANVAS/COLS

function draw(ctx: CanvasRenderingContext2D, s: SnakeState): void {
  const cell = CANVAS / COLS;
  ctx.clearRect(0, 0, CANVAS, CANVAS);

  ctx.fillStyle = "#ef4444";
  ctx.fillRect(s.food.x * cell, s.food.y * cell, cell, cell);

  s.snake.forEach((c, i) => {
    ctx.fillStyle = i === 0 ? "#eab308" : s.dead ? "#7f1d1d" : "#22c55e";
    ctx.fillRect(c.x * cell + 1, c.y * cell + 1, cell - 2, cell - 2);
  });
}

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
};

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SnakeState>(createSnake(COLS, ROWS));
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);

  const vira = useCallback((dir: Dir) => {
    stateRef.current = turn(stateRef.current, dir);
  }, []);

  const reinicia = useCallback(() => {
    stateRef.current = createSnake(COLS, ROWS);
    setScore(0);
    setDead(false);
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    draw(ctx, stateRef.current);

    const id = setInterval(() => {
      const proximo = stepSnake(stateRef.current);
      stateRef.current = proximo;
      draw(ctx, proximo);
      setScore(proximo.score);
      setDead(proximo.dead);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = KEY_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      vira(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vira]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS}
          height={CANVAS}
          aria-label="Snake"
          className="block rounded-lg border border-[var(--border)] bg-[#0b1220]"
        />
        <span className="pointer-events-none absolute right-1.5 top-1 font-[family-name:var(--font-mono-face)] text-sm font-bold tabular-nums text-white">
          {score}
        </span>
        {dead ? (
          <button
            type="button"
            onClick={reinicia}
            className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 text-xs font-semibold text-white"
          >
            recomeçar
          </button>
        ) : null}
      </div>

      {/* D-pad pra jogar no toque (o WebView nao tem teclado de setas). */}
      <div className="grid grid-cols-3 gap-1" aria-hidden={false}>
        <span />
        <DirBtn label="Cima" onPress={() => vira("UP")}>↑</DirBtn>
        <span />
        <DirBtn label="Esquerda" onPress={() => vira("LEFT")}>←</DirBtn>
        <DirBtn label="Baixo" onPress={() => vira("DOWN")}>↓</DirBtn>
        <DirBtn label="Direita" onPress={() => vira("RIGHT")}>→</DirBtn>
      </div>
    </div>
  );
}

function DirBtn({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className="flex size-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] transition-colors hover:text-[var(--text)] touch-none"
    >
      {children}
    </button>
  );
}
