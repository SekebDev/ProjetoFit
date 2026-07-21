"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * prefers-reduced-motion como store externo. Diferente do useReducedMotion
 * do Motion (que cacheia a media query num singleton), este lê o matchMedia
 * a cada snapshot — reage a mudanças ao vivo e é testável por mock.
 * No servidor assume false (sem motion API lá; o CSS cobre o primeiro paint).
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
