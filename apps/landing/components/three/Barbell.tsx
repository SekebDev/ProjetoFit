"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { RefObject } from "react";
import type { Group } from "three";
import { BRAND } from "@/lib/palette";

/** Anilha da barra: cor de grupo muscular, raio e posição no eixo. */
export interface Plate {
  cor: string;
  raio: number;
  /** -1 esquerda, 1 direita */
  lado: -1 | 1;
  /** 0 = encostada no colar, 2 = mais externa */
  slot: 0 | 1 | 2;
}

const ESPESSURA = 0.09;
const RAIOS = [0.62, 0.5, 0.4] as const;

/** [esquerda, direita] por slot — as 6 cores de grupo muscular do app. */
const CORES = [
  [BRAND.back, BRAND.chest],
  [BRAND.legs, BRAND.shoulders],
  [BRAND.core, BRAND.arms],
] as const;

/** Exportado pros testes: 6 anilhas, uma cor por grupo muscular. */
export const PLATES: Plate[] = CORES.flatMap(([esq, dir], slot) => [
  { cor: esq, raio: RAIOS[slot], lado: -1 as const, slot: slot as 0 | 1 | 2 },
  { cor: dir, raio: RAIOS[slot], lado: 1 as const, slot: slot as 0 | 1 | 2 },
]);

/**
 * Deriva de cada anilha na vista explodida (y/z/giro). Valores fixos pra
 * explosão ser idêntica em todo scroll, mas assimétricos o bastante pra
 * parecer orgânica em vez de espelhada. Mesma ordem de PLATES.
 */
const DERIVA = [
  { y: 0.34, z: -0.22, rot: 0.5 },
  { y: -0.18, z: 0.3, rot: -0.4 },
  { y: -0.3, z: -0.34, rot: -0.55 },
  { y: 0.26, z: 0.18, rot: 0.6 },
  { y: 0.18, z: 0.36, rot: 0.7 },
  { y: -0.32, z: -0.26, rot: -0.65 },
] as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Escurece uma cor hex — sombra dos rebaixos de face da anilha. */
function escurecer(hex: string, fator: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 0xff) * fator);
  const g = Math.round(((n >> 8) & 0xff) * fator);
  const b = Math.round((n & 0xff) * fator);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function baseX(p: Plate): number {
  return p.lado * (1.665 + p.slot * (ESPESSURA + 0.015));
}

/** Progresso individual da anilha: as externas saem primeiro. */
function plateT(t: number, slot: number): number {
  const atraso = (2 - slot) * 0.16;
  return easeOutCubic(clamp01((t - atraso) / 0.68));
}

/**
 * Uma bumper plate: corpo de borracha colorida, anel rebaixado em cada
 * face, cubo de borracha escura e inserto de aço no furo — os detalhes que
 * separam "anilha" de "disco liso de plástico".
 */
function AnilhaMesh({ plate }: { plate: Plate }) {
  const sombra = escurecer(plate.cor, 0.55);

  return (
    <>
      {/* corpo de borracha */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[plate.raio, plate.raio, ESPESSURA, 64]} />
        <meshStandardMaterial
          color={plate.cor}
          metalness={0.08}
          roughness={0.48}
        />
      </mesh>
      {/* anel rebaixado em cada face, como numa bumper de verdade */}
      {([-1, 1] as const).map((f) => (
        <mesh
          key={f}
          position={[f * (ESPESSURA / 2 + 0.002), 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <torusGeometry args={[plate.raio * 0.72, 0.011, 12, 64]} />
          <meshStandardMaterial color={sombra} metalness={0.1} roughness={0.6} />
        </mesh>
      ))}
      {/* cubo central de borracha escura */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.165, 0.165, ESPESSURA + 0.012, 32]} />
        <meshStandardMaterial
          color={BRAND.surface2}
          metalness={0.2}
          roughness={0.5}
        />
      </mesh>
      {/* inserto de aço do furo */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, ESPESSURA + 0.028, 24]} />
        <meshStandardMaterial color="#d7dbe3" metalness={0.95} roughness={0.18} />
      </mesh>
    </>
  );
}

interface BarbellProps {
  /**
   * 0 = barra montada, 1 = vista explodida. Lido por frame no useFrame —
   * sem re-render React. Sem a ref, a barra fica montada e parada.
   */
  progressRef?: RefObject<number>;
}

/**
 * Barra olímpica procedural: eixo com marcas de pegada, mangas, presilhas e
 * 6 bumper plates nas cores de grupo muscular do app. Primitivas three
 * puras — sem GLB, sem asset. Os materiais contam com o <Environment> das
 * cenas pro metal refletir de verdade.
 */
export function Barbell({ progressRef }: BarbellProps) {
  const anilhas = useRef<(Group | null)[]>([]);
  const presilhas = useRef<(Group | null)[]>([]);

  useFrame(() => {
    if (!progressRef) return;
    const t = progressRef.current;

    PLATES.forEach((p, i) => {
      const g = anilhas.current[i];
      if (!g) return;
      const pt = plateT(t, p.slot);
      const d = DERIVA[i];
      g.position.x = baseX(p) + p.lado * pt * (0.7 + (2 - p.slot) * 0.38);
      g.position.y = pt * d.y;
      g.position.z = pt * d.z;
      g.rotation.z = pt * d.rot;
    });

    presilhas.current.forEach((g, i) => {
      if (!g) return;
      const lado = i === 0 ? -1 : 1;
      const pc = easeOutCubic(clamp01(t / 0.4));
      g.position.x = lado * (1.98 + pc * 2.1);
      g.position.y = pc * (i === 0 ? 0.42 : -0.36);
      g.rotation.z = pc * (i === 0 ? 1.1 : -0.9);
    });
  });

  return (
    <group>
      {/* eixo */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 3.24, 32]} />
        <meshStandardMaterial color="#c3c8d3" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* marcas de pegada no eixo (anéis do knurling) */}
      {([-0.55, 0.55] as const).map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.037, 0.037, 0.014, 24]} />
          <meshStandardMaterial color="#7d8494" metalness={0.9} roughness={0.4} />
        </mesh>
      ))}

      {/* mangas, flanges e tampas, fixas no eixo */}
      {([-1, 1] as const).map((lado) => (
        <group key={lado}>
          <mesh position={[lado * 2.03, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.072, 0.072, 0.82, 32]} />
            <meshStandardMaterial
              color="#aeb4c0"
              metalness={0.95}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[lado * 1.585, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.17, 0.17, 0.07, 40]} />
            <meshStandardMaterial
              color="#8e95a3"
              metalness={0.95}
              roughness={0.32}
            />
          </mesh>
          {/* tampa da ponta da manga */}
          <mesh position={[lado * 2.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.078, 0.078, 0.02, 32]} />
            <meshStandardMaterial
              color="#69707e"
              metalness={0.9}
              roughness={0.35}
            />
          </mesh>
        </group>
      ))}

      {/* presilhas — as primeiras a saltar na explosão */}
      {([-1, 1] as const).map((lado, i) => (
        <group
          key={lado}
          ref={(el) => {
            presilhas.current[i] = el;
          }}
          position={[lado * 1.98, 0, 0]}
        >
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.085, 0.022, 12, 32]} />
            <meshStandardMaterial
              color={BRAND.chalk}
              metalness={0.75}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}

      {/* anilhas — cor por grupo muscular, como no app */}
      {PLATES.map((p, i) => (
        <group
          key={`${p.lado}-${p.slot}`}
          ref={(el) => {
            anilhas.current[i] = el;
          }}
          position={[baseX(p), 0, 0]}
        >
          <AnilhaMesh plate={p} />
        </group>
      ))}
    </group>
  );
}
