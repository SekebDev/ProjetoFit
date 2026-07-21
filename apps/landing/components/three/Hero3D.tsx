"use client";

import dynamic from "next/dynamic";
import { useInView } from "@/hooks/useInView";

// ssr:false mantém o three.js inteiro fora do bundle inicial e do HTML do
// servidor; o chunk só baixa quando o wrapper entra no viewport.
const HeroScene = dynamic(() => import("@/components/three/HeroScene"), {
  ssr: false,
});

/** Camada 3D do hero: decorativa (aria-hidden), atrás do conteúdo. */
export function Hero3D() {
  const { ref, isInView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      aria-hidden
      data-testid="hero-3d"
      className="pointer-events-none absolute inset-0"
    >
      {isInView ? <HeroScene /> : null}
    </div>
  );
}
