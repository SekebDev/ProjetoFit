"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Kicker } from "@/components/ui/Kicker";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { gsap } from "@/lib/gsap";

/**
 * Fechamento: headline display gigante + CTA. Entrada única no scroll; com
 * reduced motion o bloco já nasce visível.
 */
export function FinalCTA() {
  const scope = useRef<HTMLElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduceMotion) return;

      gsap.from("[data-cta-fade]", {
        y: 32,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: {
          trigger: scope.current,
          start: "top 75%",
          once: true,
        },
      });
    },
    { scope, dependencies: [reduceMotion] },
  );

  return (
    <section
      ref={scope}
      aria-labelledby="cta-heading"
      className="relative overflow-hidden px-6 py-32 text-center"
    >
      <div aria-hidden className="spotlight" />

      <div className="relative">
        {/* faixa de knurling: a pegada da barra emoldura o fechamento */}
        <div
          data-cta-fade
          aria-hidden
          className="knurl mx-auto mb-10 h-2.5 w-full max-w-sm border-y border-border/70"
        />
        <div data-cta-fade>
          <Kicker cor="var(--m-chest)">Sem desculpa</Kicker>
        </div>
        <h2
          id="cta-heading"
          data-cta-fade
          className="mt-4 font-display text-6xl uppercase leading-[0.95] tracking-tight sm:text-8xl"
        >
          Bora treinar?
        </h2>
        <p
          data-cta-fade
          className="mx-auto mt-6 max-w-md text-pretty text-muted-foreground"
        >
          Instalável como PWA — a academia inteira no bolso, funcionando até
          offline.
        </p>
        <div data-cta-fade className="mt-8">
          <Button
            size="lg"
            className="h-14 px-10 font-display text-lg uppercase tracking-wide"
          >
            Começar agora
          </Button>
        </div>
        <div
          data-cta-fade
          aria-hidden
          className="knurl mx-auto mt-12 h-2.5 w-full max-w-sm border-y border-border/70"
        />
      </div>
    </section>
  );
}
