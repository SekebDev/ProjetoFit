"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { Hero3D } from "@/components/three/Hero3D";
import { Button } from "@/components/ui/button";
import { Kicker } from "@/components/ui/Kicker";
import { gsap, SplitText } from "@/lib/gsap";

/**
 * Hero: cena 3D ao fundo, headline com reveal por chars (SplitText) disparado
 * por ScrollTrigger. Com reduced motion nada anima — o texto já nasce visível.
 */
export function Hero() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduceMotion) return;

      const split = SplitText.create("[data-hero-title]", {
        type: "words,chars",
      });
      gsap.from(split.chars, {
        yPercent: 110,
        opacity: 0,
        duration: 1,
        ease: "power4.out",
        stagger: 0.02,
        scrollTrigger: {
          trigger: scope.current,
          start: "top 80%",
          once: true,
        },
      });
      gsap.from("[data-hero-fade]", {
        y: 24,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.12,
        delay: 0.5,
      });

      return () => split.revert();
    },
    { scope },
  );

  return (
    <section
      ref={scope}
      aria-labelledby="hero-heading"
      className="relative flex min-h-svh flex-col items-center overflow-hidden px-6 pt-[12vh] text-center sm:pt-[15vh]"
    >
      {/* densidade de fundo: grade de diário, holofote e a marca gigante em
          contorno cortada no rodapé — atrás de tudo, sem brigar com o texto */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="logbook-layer" />
        <div className="spotlight" />
        {/* contorno via style inline: imune a ordem de cascata/HMR — foi
            exatamente esse texto que já rendeu sólido por CSS atrasado */}
        <p
          className="absolute inset-x-0 bottom-0 translate-y-[24%] select-none whitespace-nowrap text-center font-display text-[21vw] uppercase leading-[0.8]"
          style={{
            WebkitTextStroke: "1px rgba(242, 244, 247, 0.09)",
            color: "transparent",
          }}
        >
          Hipertrof
        </p>
      </div>

      <Hero3D />

      <div className="relative z-10 flex max-w-3xl flex-col items-center gap-6">
        <div data-hero-fade>
          <Kicker>Hipertrof.AI — ProjetoFit</Kicker>
        </div>

        <h1
          id="hero-heading"
          data-hero-title
          className="text-balance font-display text-5xl uppercase leading-[0.95] tracking-tight sm:text-7xl"
        >
          Treinar nunca foi tão viciante.
        </h1>

        <p
          data-hero-fade
          className="max-w-xl text-pretty text-base text-muted-foreground sm:text-lg"
        >
          A IA monta seu plano a partir do seu perfil — objetivo, equipamento,
          lesões — e a progressão automática cuida do resto. Treinar vira
          hábito.
        </p>

        <div data-hero-fade className="flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            className="h-12 px-7 font-display text-base uppercase tracking-wide"
          >
            Começar agora
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 bg-background/40 px-7 font-display text-base uppercase tracking-wide backdrop-blur-sm"
            asChild
          >
            <a href="#funcionalidades">Ver funcionalidades</a>
          </Button>
        </div>
      </div>

      <p
        data-hero-fade
        aria-hidden
        className="absolute bottom-6 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground sm:bottom-8"
      >
        Role para explorar
      </p>
    </section>
  );
}
