"use client";

import { useSyncExternalStore } from "react";

// Casa com o breakpoint `lg` do Tailwind: acima disso as seções pinadas rodam
// o scrub (pin + 3D); abaixo, empilham em scroll natural — mesmo destino do
// reduced motion, sem o jank de pin com a barra de endereço do mobile.
const QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * True quando a viewport é desktop (>= lg). Store externo via matchMedia,
 * igual ao usePrefersReducedMotion — reage a resize ao vivo e é testável por
 * mock.
 *
 * No servidor (e na 1ª render de hidratação) assume FALSE — mobile-first de
 * propósito: garante que a variante PINADA nunca monte no cliente mobile. Se
 * assumisse true, o mobile montaria o pin por um instante, o GSAP injetaria um
 * .pin-spacer gigante no DOM real e a troca pra estático deixaria esse
 * espaçador órfão (zona morta de scroll, "trava sem nada acontecer"). No
 * desktop o cliente sobe de estático pra pinado após hidratar — criação limpa,
 * sem revert e sem espaçador fantasma.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
