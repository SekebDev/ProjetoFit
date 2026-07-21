"use client";

import Lenis from "lenis";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const LenisContext = createContext<Lenis | null>(null);

/** Instância global do Lenis (null durante SSR, antes da montagem ou com reduced motion). */
export function useLenis(): Lenis | null {
  return useContext(LenisContext);
}

/**
 * Smooth scroll global. Vive no root layout, acima de tudo.
 *
 * O Lenis NÃO roda o próprio rAF: quem o dirige é o gsap.ticker, e cada
 * scroll dispara ScrollTrigger.update — um relógio só para os dois mundos,
 * senão o ScrollTrigger lê a posição um frame atrasado e treme (jitter).
 *
 * Com prefers-reduced-motion o Lenis nem é criado: scroll nativo do browser.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    const instance = new Lenis();
    instance.on("scroll", ScrollTrigger.update);

    // gsap.ticker entrega segundos; o Lenis espera milissegundos.
    const drive = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(drive);
    // lagSmoothing ajustaria o relógio do GSAP após um frame longo, e o
    // scroll dessincronizaria do ScrollTrigger — desligado por isso.
    gsap.ticker.lagSmoothing(0);

    // Criar o Lenis é efeito por natureza (toca window/listeners) e os
    // consumidores precisam re-renderizar quando a instância existir — o
    // setState síncrono aqui é o padrão de sync com sistema externo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLenis(instance);

    return () => {
      gsap.ticker.remove(drive);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return (
    <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>
  );
}
