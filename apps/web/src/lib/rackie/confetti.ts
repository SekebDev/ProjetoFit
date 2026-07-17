import confetti from "canvas-confetti";
import type { RackieContext } from "@/lib/rackie/phrases";

/**
 * Confete da Rackie via canvas-confetti — um preset por contexto, pra dar
 * variacao de verdade em vez de um estouro so. Marcos (PR, fim de dia) ainda
 * soltam emoji junto do confete.
 *
 * Fica abaixo do balao (z-40 < z-50 da Rackie) pra ela aparecer na frente do
 * confete. Respeita prefers-reduced-motion: quem pediu menos movimento nao
 * recebe nada — a frase ja carrega a comemoracao.
 */

/** Paleta do app em hex (canvas-confetti nao entende var(--...)). */
const CORES = ["#f2f4f7", "#3da35d", "#e6a817", "#e5484d", "#3e7bfa", "#22b8cf"];

const Z = 40;

function reduzido(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * Leva de emoji dos marcos, numa segunda onda (leve atraso) pra nao sumir no
 * meio do confete. Grandes (scalar alto), lentos e com muitos ticks pra
 * flutuar e dar tempo de ver. O scalar do shapeFromText tem que casar com o do
 * confetti, senao o emoji sai borrado/minusculo.
 */
function emojiWave(emojis: string[], count: number): void {
  const scalar = 3.2;
  const shapes = emojis.map((text) =>
    confetti.shapeFromText({ text, scalar }),
  );
  window.setTimeout(() => {
    void confetti({
      particleCount: count,
      spread: 120,
      startVelocity: 26,
      scalar,
      gravity: 0.7,
      ticks: 260,
      origin: { x: 0.5, y: 0.5 },
      shapes,
      zIndex: Z,
      disableForReducedMotion: true,
    });
  }, 160);
}

/** Serie comum: um pop rapido e discreto no centro. */
function popSerie(): void {
  void confetti({
    particleCount: 34,
    spread: 60,
    startVelocity: 30,
    scalar: 0.85,
    gravity: 1.1,
    ticks: 120,
    origin: { x: 0.5, y: 0.55 },
    colors: CORES,
    zIndex: Z,
    disableForReducedMotion: true,
  });
}

/** PR: canhao duplo dos dois lados + uma leva de emoji forte. */
function comemoraPr(): void {
  const base = {
    particleCount: 60,
    spread: 70,
    startVelocity: 45,
    colors: CORES,
    zIndex: Z,
    disableForReducedMotion: true,
  };
  void confetti({ ...base, angle: 60, origin: { x: 0, y: 0.6 } });
  void confetti({ ...base, angle: 120, origin: { x: 1, y: 0.6 } });
  emojiWave(["💪", "🔥"], 14);
}

/** Fim de dia: estouro de multiplas origens (mais curto) + emoji de fechamento. */
function comemoraDia(): void {
  const fim = Date.now() + 320;
  const dispara = () => {
    void confetti({
      particleCount: 22,
      spread: 95,
      startVelocity: 38,
      origin: { x: 0.5, y: 0.55 },
      colors: CORES,
      zIndex: Z,
      disableForReducedMotion: true,
    });
    if (Date.now() < fim) requestAnimationFrame(dispara);
  };
  dispara();
  emojiWave(["💪", "🔥", "🐔"], 16);
}

/** Dispara o confete do contexto. No-op sob prefers-reduced-motion. */
export function fireConfetti(context: RackieContext): void {
  if (reduzido()) return;
  switch (context) {
    case "pr":
      comemoraPr();
      break;
    case "day":
      comemoraDia();
      break;
    case "set":
      popSerie();
      break;
    case "rest":
      // Descanso nao estoura confete — a Rackie so protege a recuperacao.
      break;
  }
}
