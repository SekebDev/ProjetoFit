"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { BarbellExplode3D } from "@/components/three/BarbellExplode3D";
import { Kicker } from "@/components/ui/Kicker";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { gsap } from "@/lib/gsap";

interface Capacidade {
  titulo: string;
  texto: string;
  /** denominação de anilha (kg) — do maior peso pro menor, como na barra */
  peso: string;
  /** cor da anilha correspondente na barra 3D (var CSS da paleta) */
  cor: string;
}

/** Uma capacidade do app por anilha — a IA carrega o peso mais pesado. */
const CAPACIDADES: Capacidade[] = [
  {
    titulo: "Planos por IA",
    texto:
      "Objetivo, experiência, equipamento e lesões viram um plano completo com agenda semanal — gerado em segundos, ajustado ao seu nível.",
    peso: "25",
    cor: "var(--m-chest)",
  },
  {
    titulo: "Biblioteca completa",
    texto:
      "873 exercícios com imagem, grupo muscular, equipamento e instruções de execução.",
    peso: "20",
    cor: "var(--m-back)",
  },
  {
    titulo: "Sessão guiada",
    texto:
      "Carga da última vez já preenchida, RPE e timer de descanso na tela.",
    peso: "15",
    cor: "var(--m-shoulders)",
  },
  {
    titulo: "Progresso de verdade",
    texto:
      "Volume semanal, evolução de carga, PRs detectados e composição corporal.",
    peso: "10",
    cor: "var(--m-arms)",
  },
  {
    titulo: "XP, conquistas e ranking",
    texto:
      "Sequência de dias, níveis, 12 conquistas e ranking entre amigos.",
    peso: "5",
    cor: "var(--m-legs)",
  },
  {
    titulo: "Modo Dopamina",
    texto: "E, se quiser, minigames no tempo de descanso. Só um extra.",
    peso: "2,5",
    cor: "var(--m-core)",
  },
];

/**
 * Vista explodida: a seção fica pinada enquanto o scrub desmonta a barra 3D
 * (progressRef, lido por frame na cena) e materializa um card por anilha.
 * Com reduced motion vira grade estática sem 3D — mesmo conteúdo, sem pin.
 */
export function BarbellExplode() {
  const scope = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const reduceMotion = usePrefersReducedMotion();
  const isDesktop = useIsDesktop();
  // No mobile o pin + scrub 3D quebra com a barra de endereço e os 6 cards não
  // cabem numa viewport: cai na mesma grade empilhada do reduced motion.
  const empilhado = reduceMotion || !isDesktop;

  useGSAP(
    () => {
      if (empilhado) return;

      // Proxy numérico: o tween anima um objeto e repassa o valor pra ref —
      // a cena three lê progressRef.current no useFrame, sem re-render.
      const proxy = { t: progressRef.current };
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: scope.current,
          start: "top top",
          end: "+=260%",
          scrub: 1,
          pin: true,
        },
      });

      tl.to(
        proxy,
        {
          t: 1,
          duration: 1,
          onUpdate: () => {
            progressRef.current = proxy.t;
          },
        },
        0,
      );

      // Cada card entra no momento em que "sua" anilha se solta da barra.
      gsap.utils.toArray<HTMLElement>("[data-capacidade]").forEach((el, i) => {
        tl.fromTo(
          el,
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.09, ease: "power2.out" },
          0.06 + i * 0.15,
        );
      });
    },
    { scope, dependencies: [empilhado] },
  );

  if (empilhado) {
    return (
      <section
        id="funcionalidades"
        aria-labelledby="explode-heading"
        data-testid="explode-static"
        className="px-6 py-20 sm:py-24"
      >
        <ExplodeHeading />
        <ul className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
          {CAPACIDADES.map((c) => (
            <li key={c.titulo}>
              <CapacidadeTag capacidade={c} />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section
      ref={scope}
      id="funcionalidades"
      aria-labelledby="explode-heading"
      data-testid="explode-pinned"
      className="relative flex h-svh flex-col justify-center overflow-hidden px-6"
    >
      <div aria-hidden className="absolute inset-0">
        <div className="logbook-layer" />
        <div className="spotlight" />
      </div>

      <BarbellExplode3D progressRef={progressRef} />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,24rem)_1fr]">
        <ExplodeHeading />

        <ul className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl lg:justify-self-end">
          {CAPACIDADES.map((c) => (
            <li key={c.titulo} data-capacidade>
              <CapacidadeTag capacidade={c} translucida />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ExplodeHeading() {
  return (
    <div className="mx-auto w-full max-w-2xl lg:mx-0">
      <Kicker cor="var(--m-chest)">Desmonte a barra</Kicker>
      <h2
        id="explode-heading"
        className="mt-3 font-display text-4xl uppercase tracking-tight sm:text-5xl"
      >
        Cada anilha é uma parte do app.
      </h2>
    </div>
  );
}

/**
 * Etiqueta de anilha: canto reto, borda superior na cor do grupo e a
 * denominação em kg estampada — o card carrega o código visual da barra.
 */
function CapacidadeTag({
  capacidade,
  translucida = false,
}: {
  capacidade: Capacidade;
  translucida?: boolean;
}) {
  return (
    <div
      className={`h-full border border-t-4 p-4 ${
        translucida ? "bg-surface-2/70 backdrop-blur-sm" : "bg-card"
      }`}
      style={{ borderTopColor: capacidade.cor }}
    >
      <p
        className="font-display text-2xl leading-none"
        style={{ color: capacidade.cor }}
      >
        {capacidade.peso}
        <span className="ml-1 align-middle font-mono text-[10px] tracking-widest text-muted-foreground">
          KG
        </span>
      </p>
      <h3 className="mt-2.5 font-semibold">{capacidade.titulo}</h3>
      <p className="mt-1 text-sm text-pretty text-muted-foreground">
        {capacidade.texto}
      </p>
    </div>
  );
}
