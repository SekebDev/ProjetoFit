"use client";

import {
  ContactShadows,
  Environment,
  Float,
  Lightformer,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { Barbell } from "@/components/three/Barbell";
import { BRAND } from "@/lib/palette";

/**
 * Cena do hero: a barra olímpica montada, flutuando de quina sobre uma
 * sombra de contato. Default export por causa do next/dynamic em Hero3D —
 * este módulo (e o three inteiro) fica fora do bundle inicial.
 *
 * O <Environment> é procedural (Lightformers, sem fetch de HDR): é ele que
 * faz o cromado do eixo refletir em vez de parecer plástico cinza.
 *
 * Com reduced motion a cena vira uma escultura parada: sem float, sem giro.
 */
export default function HeroScene() {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 4, 6]} intensity={1.1} />
      <directionalLight
        position={[-6, -2, 2]}
        intensity={0.4}
        color={BRAND.back}
      />

      {/* a barra vive ABAIXO do bloco de texto (grupo deslocado pra baixo):
          headline em cima, produto embaixo — nada um em cima do outro */}
      <Float
        speed={reduceMotion ? 0 : 1.4}
        rotationIntensity={reduceMotion ? 0 : 0.35}
        floatIntensity={reduceMotion ? 0 : 0.6}
      >
        <group position={[0, -0.95, 0]} rotation={[0.16, -0.5, -0.14]} scale={0.8}>
          <Barbell />
        </group>
      </Float>

      <ContactShadows
        position={[0, -1.62, 0]}
        opacity={0.4}
        scale={6.5}
        blur={2.6}
        far={2}
        resolution={256}
        frames={reduceMotion ? 1 : Infinity}
      />

      <Environment resolution={256} frames={1}>
        {/* estúdio: softbox de teto, painéis laterais coloridos e dois
            painéis frontais/traseiros fracos pro cromado não refletir breu */}
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
