"use client";

import dynamic from "next/dynamic";
import type { RefObject } from "react";
import { useInView } from "@/hooks/useInView";

// ssr:false mantém o three.js fora do bundle inicial e do HTML do servidor;
// o chunk só baixa quando o wrapper entra no viewport (mesmo padrão do Hero3D).
const BarbellExplodeScene = dynamic(
  () => import("@/components/three/BarbellExplodeScene"),
  { ssr: false },
);

interface Props {
  /** Compartilhada com o ScrollTrigger da seção — a cena lê por frame. */
  progressRef: RefObject<number>;
}

/** Camada 3D da vista explodida: decorativa (aria-hidden), atrás dos cards. */
export function BarbellExplode3D({ progressRef }: Props) {
  const { ref, isInView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      aria-hidden
      data-testid="explode-3d"
      className="pointer-events-none absolute inset-0"
    >
      {isInView ? <BarbellExplodeScene progressRef={progressRef} /> : null}
    </div>
  );
}
