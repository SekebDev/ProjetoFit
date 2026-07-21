"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import type { RefObject } from "react";
import type { Group } from "three";
import { Barbell } from "@/components/three/Barbell";
import { BRAND } from "@/lib/palette";

interface Props {
  /** 0→1 vindo do scrub do ScrollTrigger (seção BarbellExplode). */
  progressRef: RefObject<number>;
}

/**
 * Grupo que gira conforme a explosão avança: a barra começa de quina e
 * termina quase de frente, pra vista explodida abrir na horizontal.
 * A escala cai em viewports estreitos pra explosão inteira caber.
 */
function Rig({ progressRef }: Props) {
  const group = useRef<Group>(null);
  const { viewport } = useThree();

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = progressRef.current;
    g.rotation.x = 0.1 + t * 0.06;
    g.rotation.y = -0.55 + t * 0.8;
    g.rotation.z = -0.3 + t * 0.14;
  });

  const escala = Math.min(1, viewport.width / 8.4);

  return (
    <group ref={group} scale={escala}>
      <Barbell progressRef={progressRef} />
    </group>
  );
}

/**
 * Cena da vista explodida. Default export por causa do next/dynamic em
 * BarbellExplode3D — o three inteiro fica fora do bundle inicial.
 *
 * Reduced motion não passa por aqui: a seção troca pra variante estática
 * sem 3D antes de montar a cena.
 */
export default function BarbellExplodeScene({ progressRef }: Props) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5.6], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 4, 6]} intensity={1.1} />
      <directionalLight
        position={[-6, -2, 2]}
        intensity={0.4}
        color={BRAND.back}
      />
      <Rig progressRef={progressRef} />

      {/* mesmo estúdio procedural do hero: metal reflete, borracha não */}
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={3} position={[0, 4, 3]} scale={[9, 3, 1]} />
        <Lightformer
          intensity={1.1}
          position={[-5, 1, -3]}
          rotation={[0, Math.PI / 2.6, 0]}
          scale={[5, 2, 1]}
          color={BRAND.back}
        />
        <Lightformer
          intensity={0.9}
          position={[5, -1, 2]}
          rotation={[0, -Math.PI / 2.6, 0]}
          scale={[4, 2, 1]}
          color={BRAND.shoulders}
        />
        <Lightformer intensity={0.5} position={[0, 0, 5]} scale={[12, 8, 1]} />
        <Lightformer intensity={0.4} position={[0, -3, -4]} scale={[12, 8, 1]} />
      </Environment>
    </Canvas>
  );
}
