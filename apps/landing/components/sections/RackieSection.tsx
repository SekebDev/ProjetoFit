"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { Kicker } from "@/components/ui/Kicker";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { gsap } from "@/lib/gsap";

interface Momento {
  img: string;
  alt: string;
  contexto: string;
  /** frase real do pool da Rackie no app (apps/web/src/lib/rackie/phrases.ts) */
  fala: string;
  cor: string;
}

const MOMENTOS: Momento[] = [
  {
    img: "/mascot/cheer.webp",
    alt: "Rackie comemorando",
    contexto: "Quando você bate um PR",
    fala: "PR NA CONTA! Agora sim, monstro!",
    cor: "var(--m-shoulders)",
  },
  {
    img: "/mascot/rest.webp",
    alt: "Rackie relaxada no descanso",
    contexto: "No timer de descanso",
    fala: "Descanso também é treino, não inventa moda.",
    cor: "var(--m-core)",
  },
  {
    img: "/mascot/sad.webp",
    alt: "Rackie inconformada",
    contexto: "Quando te passam no ranking",
    fala: "Ana te passou. Vai deixar barato, frango?",
    cor: "var(--m-chest)",
  },
];

/**
 * Apresenta a Rackie com três momentos reais do app — as falas vêm do pool
 * dela, sem inventar tom. Entrada com stagger no scroll; com reduced motion
 * nada anima e os cards já nascem visíveis (o conteúdo é o mesmo).
 */
export function RackieSection() {
  const scope = useRef<HTMLElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduceMotion) return;

      gsap.from("[data-momento]", {
        y: 40,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.15,
        scrollTrigger: {
          trigger: scope.current,
          start: "top 70%",
          once: true,
        },
      });
    },
    { scope, dependencies: [reduceMotion] },
  );

  return (
    <section
      ref={scope}
      aria-labelledby="rackie-heading"
      className="px-6 py-20 sm:py-24"
    >
      <div className="mx-auto w-full max-w-4xl text-center">
        <Kicker cor="var(--m-arms)">Sua parceira de treino</Kicker>
        <h2
          id="rackie-heading"
          className="mt-3 font-display text-4xl uppercase tracking-tight sm:text-5xl"
        >
          Conheça a Rackie.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
          Ela zoa, comemora PR no talo e protege seu descanso. Nunca culpa —
          só aquela pressão de amigo raiz pra você voltar amanhã.
        </p>
      </div>

      <ul className="mx-auto mt-14 grid max-w-4xl gap-8 sm:grid-cols-3">
        {MOMENTOS.map((m) => (
          <li
            key={m.contexto}
            data-momento
            className="flex flex-col items-center gap-4 rounded-xl border bg-card p-6 text-center"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              {m.contexto}
            </p>
            <blockquote
              className="relative mb-1.5 rounded-2xl border-2 bg-card px-4 py-3 text-sm font-medium text-pretty"
              style={{ borderColor: m.cor }}
            >
              “{m.fala}”
              {/* rabinho do balão: quadrado girado com as mesmas bordas */}
              <span
                aria-hidden
                className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 bg-card"
                style={{ borderColor: m.cor }}
              />
            </blockquote>
            {/* mesma decisão do Mascot do app web: altura fixa, largura da arte */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m.img}
              alt={m.alt}
              className="mt-auto h-40 w-auto select-none"
              loading="lazy"
              draggable={false}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
