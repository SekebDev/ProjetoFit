"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createFlappy,
  FLAPPY,
  flap,
  type FlappyState,
  type Pipe,
  stepFlappy,
} from "@/lib/games/flappy";

// Abertura do proximo cano entre 25% e 75% da altura — nunca colada nas bordas.
const randomGap = () => FLAPPY.world * 0.25 + Math.random() * FLAPPY.world * 0.5;

// Trava o passo maximo: se a aba dormiu (celular no bolso), o dt gigante nao
// pode teletransportar o passaro pra dentro de um cano. Melhor um "pulo" curto.
const MAX_DT = 50;

// Estrelas fixas (deterministicas) no ceu — paradas, sem custo por frame.
const ESTRELAS = Array.from({ length: 28 }, (_, i) => ({
  x: ((i * 97) % 100) / 100,
  y: ((i * 53) % 100) / 100,
}));

function desenhaMorros(ctx: CanvasRenderingContext2D, w: number, h: number, off: number): void {
  const baseY = h * 0.95;
  const r = w * 0.28;
  ctx.fillStyle = "rgba(96, 66, 140, 0.5)";
  ctx.beginPath();
  ctx.moveTo(0, h);
  const inicio = -(((off * 0.15) % (r * 2)) + r * 2);
  for (let x = inicio; x < w + r * 2; x += r * 2) {
    ctx.arc(x, baseY, r, Math.PI, 0, false);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function desenhaCano(ctx: CanvasRenderingContext2D, p: Pipe, sx: number, sy: number, h: number): void {
  const x = p.x * sx;
  const w = FLAPPY.pipeWidth * sx;
  const half = FLAPPY.gapHeight / 2;
  const topH = (p.gapY - half) * sy;
  const botY = (p.gapY + half) * sy;
  const capH = Math.min(16, w * 0.55);
  const capOver = w * 0.12;
  const r = Math.min(8, w * 0.28);

  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, "#15803d");
  grad.addColorStop(0.5, "#34d399");
  grad.addColorStop(1, "#15803d");
  ctx.fillStyle = grad;

  // Cano de cima: corpo + bocal.
  ctx.beginPath();
  ctx.roundRect(x, 0, w, Math.max(0, topH - capH), [0, 0, r, r]);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x - capOver, Math.max(0, topH - capH), w + capOver * 2, capH, r);
  ctx.fill();

  // Cano de baixo: bocal + corpo.
  ctx.beginPath();
  ctx.roundRect(x - capOver, botY, w + capOver * 2, capH, r);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x, botY + capH, w, Math.max(0, h - (botY + capH)), [r, r, 0, 0]);
  ctx.fill();

  // Brilho vertical pra dar volume de tubo.
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  const bw = Math.max(1, w * 0.12);
  ctx.fillRect(x + w * 0.22, 0, bw, Math.max(0, topH - capH));
  ctx.fillRect(x + w * 0.22, botY + capH, bw, Math.max(0, h - (botY + capH)));
}

function desenhaPassaro(
  ctx: CanvasRenderingContext2D,
  s: FlappyState,
  sx: number,
  sy: number,
  u: number,
  scroll: number,
  reduzido: boolean,
): void {
  const cx = FLAPPY.birdX * sx;
  const cy = s.birdY * sy;
  const R = FLAPPY.birdRadius * u * 1.4;
  const ang = Math.max(-0.6, Math.min(1.2, s.velocity * 4));

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);

  // Corpo.
  const body = ctx.createLinearGradient(0, -R, 0, R);
  body.addColorStop(0, s.dead ? "#9ca3af" : "#fde047");
  body.addColorStop(1, s.dead ? "#6b7280" : "#f59e0b");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 1.15, R, 0, 0, Math.PI * 2);
  ctx.fill();

  // Asa (bate sozinha, a menos que reduced-motion).
  const bat = reduzido ? 0 : Math.sin(scroll * 0.5) * R * 0.35;
  ctx.fillStyle = s.dead ? "#4b5563" : "#f97316";
  ctx.beginPath();
  ctx.ellipse(-R * 0.2, bat, R * 0.62, R * 0.4, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Olho.
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(R * 0.45, -R * 0.35, R * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0b1220";
  ctx.beginPath();
  ctx.arc(R * 0.54, -R * 0.35, R * 0.14, 0, Math.PI * 2);
  ctx.fill();

  // Bico.
  ctx.fillStyle = "#fb923c";
  ctx.beginPath();
  ctx.moveTo(R * 1.0, -R * 0.05);
  ctx.lineTo(R * 1.5, R * 0.05);
  ctx.lineTo(R * 1.0, R * 0.22);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function draw(
  ctx: CanvasRenderingContext2D,
  s: FlappyState,
  w: number,
  h: number,
  scroll: number,
  reduzido: boolean,
): void {
  if (w <= 0 || h <= 0) return;
  const sx = w / FLAPPY.world;
  const sy = h / FLAPPY.world;
  const u = Math.min(sx, sy);
  const off = reduzido ? 0 : scroll;

  // Ceu.
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#0b1026");
  sky.addColorStop(0.55, "#1a1442");
  sky.addColorStop(1, "#3b1d5e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Estrelas.
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (const st of ESTRELAS) {
    ctx.fillRect(st.x * w, st.y * h * 0.6, 1.5, 1.5);
  }

  desenhaMorros(ctx, w, h, off);

  for (const p of s.pipes) desenhaCano(ctx, p, sx, sy, h);

  // Chao com traços rolando.
  const chaoH = h * 0.06;
  ctx.fillStyle = "#241a3a";
  ctx.fillRect(0, h - chaoH, w, chaoH);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  const passo = 24;
  ctx.beginPath();
  for (let x = -(off % passo); x < w; x += passo) {
    ctx.moveTo(x, h - chaoH);
    ctx.lineTo(x + passo * 0.5, h);
  }
  ctx.stroke();

  desenhaPassaro(ctx, s, sx, sy, u, scroll, reduzido);
}

/**
 * Flappy do Modo Dopamina em tela cheia. Toque (ou clique) em qualquer lugar
 * pula; num passaro morto, reinicia. Visual repaginado (ceu, morros, canos com
 * bocal, passaro que inclina com a velocidade). O mundo e normalizado, entao a
 * tela cheia preserva a proporcao/tempo da queda — a fisica foi suavizada no
 * motor (flappy.ts), com velocidade terminal.
 */
export function FlappyGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<FlappyState>(createFlappy(randomGap));
  const wRef = useRef(0);
  const hRef = useRef(0);
  const scrollRef = useRef(0);
  const reduzidoRef = useRef(false);
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);

  const acao = useCallback(() => {
    if (stateRef.current.dead) {
      stateRef.current = createFlappy(randomGap);
      scrollRef.current = 0;
      setScore(0);
      setDead(false);
      return;
    }
    stateRef.current = flap(stateRef.current);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduzidoRef.current = mql.matches;
    const on = () => {
      reduzidoRef.current = mql.matches;
    };
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!container || !canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;

    const ajusta = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      wRef.current = w;
      hRef.current = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    ajusta();
    const ro = new ResizeObserver(ajusta);
    ro.observe(container);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(now - last, MAX_DT);
      last = now;
      const proximo = stepFlappy(stateRef.current, dt, randomGap);
      stateRef.current = proximo;
      if (!reduzidoRef.current && !proximo.dead) scrollRef.current += dt * 0.03;
      draw(ctx, proximo, wRef.current, hRef.current, scrollRef.current, reduzidoRef.current);
      setScore(proximo.score);
      setDead(proximo.dead);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
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
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label={
        dead ? "Flappy: fim de jogo, toque para recomeçar" : "Flappy: toque para subir"
      }
      className="absolute inset-0 touch-none"
      onPointerDown={(e) => {
        e.preventDefault();
        acao();
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      <span className="pointer-events-none absolute right-4 top-3 font-[family-name:var(--font-mono-face)] text-xl font-bold tabular-nums text-white/90">
        {score}
      </span>

      {!dead && score === 0 ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-8 text-center text-xs text-white/50">
          toque para voar
        </p>
      ) : null}

      {dead ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
          <p className="text-base font-semibold text-white/90">fim de jogo</p>
          <p className="text-sm text-white/60">toque para recomeçar</p>
        </div>
      ) : null}
    </div>
  );
}
