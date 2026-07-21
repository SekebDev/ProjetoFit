"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { Kicker } from "@/components/ui/Kicker";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { gsap } from "@/lib/gsap";

interface Passo {
  numero: string;
  titulo: string;
  texto: string;
  cor: string;
}

const PASSOS: Passo[] = [
  {
    numero: "01",
    titulo: "Conte quem você é",
    texto:
      "Objetivo, experiência, equipamento disponível e lesões — seu perfil de treino.",
    cor: "var(--m-back)",
  },
  {
    numero: "02",
    titulo: "A IA gera seu plano",
    texto:
      "Plano completo com agenda semanal, ajustado ao seu perfil, em segundos. Prefere no braço? Monta manual.",
    cor: "var(--m-shoulders)",
  },
  {
    numero: "03",
    titulo: "Treine com a Rackie",
    texto:
      "Carga anterior pré-preenchida, timer de descanso e a Rackie na torcida.",
    cor: "var(--m-arms)",
  },
  {
    numero: "04",
    titulo: "Veja o progresso",
    texto:
      "Volume, PRs, gráficos de carga — e o ranking do grupo pra ninguém relaxar.",
    cor: "var(--m-legs)",
  },
];

/**
 * Do cadastro ao PR em 4 passos. Entrada com stagger no scroll; com reduced
 * motion nada anima — os passos já nascem visíveis.
 */
export function HowItWorks() {
  const scope = useRef<HTMLElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduceMotion) return;

      gsap.from("[data-passo]", {
        y: 32,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.12,
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
      aria-labelledby="how-heading"
      className="px-6 py-20 sm:py-24"
    >
      <div className="mx-auto w-full max-w-5xl">
        <Kicker cor="var(--m-back)">Do zero ao PR</Kicker>
        <h2
          id="how-heading"
          className="mt-3 font-display text-4xl uppercase tracking-tight sm:text-5xl"
        >
          Como funciona.
        </h2>

        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map((p) => (
            <li key={p.numero} data-passo className="flex flex-col gap-3">
              {/* número estêncil: só o contorno na cor do grupo, como
                  numeração pintada em parede de ginásio */}
              <p
                className="font-display text-6xl tabular-nums"
                style={{ WebkitTextStroke: `1.5px ${p.cor}`, color: "transparent" }}
              >
                {p.numero}
              </p>
              <h3 className="text-lg font-semibold">{p.titulo}</h3>
              <p className="text-sm text-pretty text-muted-foreground">
                {p.texto}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
