"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSnake,
  type Dir,
  type SnakeState,
  stepSnake,
  turn,
} from "@/lib/games/snake";
import { swipeDir } from "@/lib/games/swipe";

const COLS = 15;
const ROWS = 15;
const TICK_MS = 140;

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
};

/** Desenha o tabuleiro num quadrado de `board` px (ctx já escalado por dpr). */
function draw(ctx: CanvasRenderingContext2D, s: SnakeState, board: number): void {
  if (board <= 0) return;
  const cell = board / COLS;
  ctx.clearRect(0, 0, board, board);

  // Grade sutil pra dar textura sem competir com os elementos.
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < COLS; i += 1) {
    const p = Math.round(i * cell) + 0.5;
    ctx.moveTo(p, 0);
    ctx.lineTo(p, board);
  }
  for (let i = 1; i < ROWS; i += 1) {
    const p = Math.round(i * cell) + 0.5;
    ctx.moveTo(0, p);
    ctx.lineTo(board, p);
  }
  ctx.stroke();

  // Comida com brilho (glow radial + núcleo sólido).
  const fx = s.food.x * cell + cell / 2;
  const fy = s.food.y * cell + cell / 2;
  const glow = ctx.createRadialGradient(fx, fy, 1, fx, fy, cell);
  glow.addColorStop(0, "rgba(239,68,68,0.85)");
  glow.addColorStop(1, "rgba(239,68,68,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(fx, fy, cell, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(fx, fy, cell * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // Corpo: segmentos arredondados, cabeça destacada, morto dessaturado.
  const total = s.snake.length;
  const pad = Math.max(1, cell * 0.08);
  const raio = Math.min(cell * 0.32, (cell - pad * 2) / 2);
  s.snake.forEach((c, i) => {
    const cabeca = i === 0;
    if (s.dead) {
      ctx.fillStyle = cabeca ? "#9ca3af" : "#4b5563";
    } else if (cabeca) {
      ctx.fillStyle = "#eab308";
    } else {
      ctx.fillStyle = i / total < 0.5 ? "#22c55e" : "#16a34a";
    }
    ctx.beginPath();
    ctx.roundRect(c.x * cell + pad, c.y * cell + pad, cell - pad * 2, cell - pad * 2, raio);
    ctx.fill();
  });

  // Olhos na cabeça, orientados pela direção.
  if (!s.dead && total > 0) {
    const head = s.snake[0];
    const cxp = head.x * cell + cell / 2;
    const cyp = head.y * cell + cell / 2;
    const off = cell * 0.24;
    const olho = Math.max(1.5, cell * 0.09);
    let ex1: number;
    let ey1: number;
    let ex2: number;
    let ey2: number;
    if (s.dir === "LEFT" || s.dir === "RIGHT") {
      const dx = s.dir === "RIGHT" ? off : -off;
      ex1 = cxp + dx;
      ey1 = cyp - off * 0.6;
      ex2 = cxp + dx;
      ey2 = cyp + off * 0.6;
    } else {
      const dy = s.dir === "DOWN" ? off : -off;
      ex1 = cxp - off * 0.6;
      ey1 = cyp + dy;
      ex2 = cxp + off * 0.6;
      ey2 = cyp + dy;
    }
    ctx.fillStyle = "#0b1220";
    ctx.beginPath();
    ctx.arc(ex1, ey1, olho, 0, Math.PI * 2);
    ctx.arc(ex2, ey2, olho, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Snake do Modo Dopamina em tela cheia. Controle 100% por arrasto (swipe): o
 * eixo dominante do gesto vira a cobra, com limiar pra não virar sem querer;
 * como reseta o ponto de referência a cada virada, dá pra encadear curvas num
 * arrasto só. Teclado de setas fica de bônus no desktop. Sem D-pad.
 */
export function SnakeGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SnakeState>(createSnake(COLS, ROWS));
  const boardRef = useRef(0);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);

  const vira = useCallback((dir: Dir) => {
    stateRef.current = turn(stateRef.current, dir);
  }, []);

  const reinicia = useCallback(() => {
    stateRef.current = createSnake(COLS, ROWS);
    dragRef.current = null;
    setScore(0);
    setDead(false);
  }, []);

  // Dimensiona o canvas pro maior quadrado que cabe no container (viewport
  // menos o HUD) e redesenha. ResizeObserver cobre rotação e teclado virtual.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!container || !canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const ajusta = () => {
      const board = Math.max(0, Math.min(container.clientWidth, container.clientHeight));
      boardRef.current = board;
      canvas.width = Math.round(board * dpr);
      canvas.height = Math.round(board * dpr);
      canvas.style.width = `${board}px`;
      canvas.style.height = `${board}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, stateRef.current, board);
    };
    ajusta();
    const ro = new ResizeObserver(ajusta);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Relógio do jogo: um passo a cada TICK_MS.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const id = setInterval(() => {
      const proximo = stepSnake(stateRef.current);
      stateRef.current = proximo;
      draw(ctx, proximo, boardRef.current);
      setScore(proximo.score);
      setDead(proximo.dead);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Bônus de desktop: setas do teclado.
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

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const ref = dragRef.current;
    if (!ref) return;
    const dir = swipeDir(e.clientX - ref.x, e.clientY - ref.y);
    if (dir) {
      vira(dir);
      dragRef.current = { x: e.clientX, y: e.clientY };
    }
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex touch-none items-center justify-center"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <canvas
        ref={canvasRef}
        aria-label="Snake"
        className="block rounded-2xl border border-white/10 bg-[#0b1220]"
      />
      <span className="pointer-events-none absolute right-4 top-3 font-[family-name:var(--font-mono-face)] text-xl font-bold tabular-nums text-white/90">
        {score}
      </span>

      {!dead && score === 0 ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-xs text-white/40">
          arraste para virar
        </p>
      ) : null}

      {dead ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55">
          <p className="text-sm font-semibold text-white/80">fim de jogo</p>
          <button
            type="button"
            onClick={reinicia}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            recomeçar
          </button>
        </div>
      ) : null}
    </div>
  );
}
