"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { Kicker } from "@/components/ui/Kicker";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { gsap } from "@/lib/gsap";

interface Feature {
  numero: string;
  titulo: string;
  texto: string;
  /** cor de anilha do grupo muscular (var CSS da paleta do web) */
  cor: string;
}

const FEATURES: Feature[] = [
  {
    numero: "01",
    titulo: "Planos gerados por IA",
    texto:
      "Objetivo, experiência, equipamento e lesões viram um plano com agenda semanal em segundos — não um template genérico.",
    cor: "var(--m-back)",
  },
  {
    numero: "02",
    titulo: "Progressão automática",
    texto:
      "A carga da última sessão já vem preenchida. Bater o registro anterior é só olhar o campo.",
    cor: "var(--m-shoulders)",
  },
  {
    numero: "03",
    titulo: "Treino em grupo",
    texto:
      "Grupos, rankings e constância compartilhada. Ninguém larga quando o resto tá olhando.",
    cor: "var(--m-legs)",
  },
  {
    numero: "04",
    titulo: "Modo Dopamina",
    texto:
      "Minigames no tempo de descanso, se você quiser — um empurrão a mais de constância.",
    cor: "var(--m-arms)",
  },
];

/**
 * Seção de referência de scroll animation: fica pinada enquanto a timeline
 * (scrub) troca uma feature pela outra. Com reduced motion vira uma grade
 * estática com tudo visível — sem pin, sem timeline.
 */
export function Features() {
  const scope = useRef<HTMLElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const isDesktop = useIsDesktop();
  // Igual à BarbellExplode: no mobile o pin quebra, então empilha a grade.
  const empilhado = reduceMotion || !isDesktop;

  useGSAP(
    () => {
      if (empilhado) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-feature]");
      if (items.length < 2) return;

      gsap.set(items.slice(1), { autoAlpha: 0, y: 48 });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: scope.current,
          start: "top top",
          end: `+=${items.length * 100}%`,
          scrub: 1,
          pin: true,
        },
      });

      items.forEach((item, i) => {
        if (i === 0) return;
        tl.to(items[i - 1], { autoAlpha: 0, y: -48, duration: 0.4 }, i - 0.4);
        tl.fromTo(
          item,
          { autoAlpha: 0, y: 48 },
          { autoAlpha: 1, y: 0, duration: 0.4 },
          i - 0.2,
        );
      });
      tl.fromTo(
        "[data-progress]",
        { scaleX: 1 / items.length },
        { scaleX: 1, duration: items.length - 1 },
        0,
      );
    },
    { scope, dependencies: [empilhado] },
  );

  if (empilhado) {
    return (
      <section
        aria-labelledby="features-heading"
        data-testid="features-static"
        className="px-6 py-20 sm:py-24"
      >
        <FeaturesHeading />
        <ul className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li
              key={f.numero}
              className="rounded-xl border bg-card p-6"
              style={{ borderLeftColor: f.cor, borderLeftWidth: 3 }}
            >
              <FeatureBody feature={f} />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section
      ref={scope}
      aria-labelledby="features-heading"
      data-testid="features-pinned"
      className="relative flex h-svh flex-col justify-center overflow-hidden px-6"
    >
      <FeaturesHeading />

      <div className="relative mx-auto mt-12 h-64 w-full max-w-2xl">
        {FEATURES.map((f) => (
          <div
            key={f.numero}
            data-feature
            className="absolute inset-0 flex flex-col justify-center gap-4"
          >
            <FeatureBody feature={f} />
          </div>
        ))}
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <div className="h-0.5 overflow-hidden rounded-full bg-border">
          <div
            data-progress
            aria-hidden
            className="h-full origin-left rounded-full bg-chalk"
          />
        </div>
      </div>
    </section>
  );
}

function FeaturesHeading() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Kicker cor="var(--m-shoulders)">Por dentro do app</Kicker>
      <h2
        id="features-heading"
        className="mt-3 font-display text-4xl uppercase tracking-tight sm:text-5xl"
      >
        Feito pra você não largar.
      </h2>
    </div>
  );
}

function FeatureBody({ feature }: { feature: Feature }) {
  return (
    <>
      <p
        className="font-mono text-sm font-semibold tabular-nums"
        style={{ color: feature.cor }}
      >
        {feature.numero}
      </p>
      <h3 className="text-2xl font-bold tracking-tight sm:text-4xl">
        {feature.titulo}
      </h3>
      <p className="max-w-xl text-pretty text-muted-foreground">
        {feature.texto}
      </p>
    </>
  );
}
