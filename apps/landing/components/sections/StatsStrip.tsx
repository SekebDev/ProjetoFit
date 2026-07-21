"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { gsap } from "@/lib/gsap";

interface Stat {
  valor: number;
  prefixo?: string;
  sufixo?: string;
  rotulo: string;
  cor: string;
}

/** Números do app (README) apresentados como anilhas. */
const STATS: Stat[] = [
  {
    valor: 873,
    rotulo: "exercícios ilustrados na biblioteca",
    cor: "var(--m-chest)",
  },
  {
    valor: 12,
    rotulo: "conquistas pra desbloquear",
    cor: "var(--m-shoulders)",
  },
  {
    valor: 50,
    prefixo: "+",
    sufixo: "%",
    rotulo: "de bônus de XP no teto da sequência",
    cor: "var(--m-arms)",
  },
  {
    valor: 100,
    sufixo: "%",
    rotulo: "funcional offline — PWA instalável",
    cor: "var(--m-legs)",
  },
];

/**
 * Faixa de números em forma de anilha. O valor final é renderizado no
 * servidor (SEO e no-JS); com motion liberado o efeito zera o contador e
 * sobe até o alvo quando a anilha entra no viewport.
 */
export function StatsStrip() {
  const scope = useRef<HTMLElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduceMotion) return;

      gsap.utils.toArray<HTMLElement>("[data-contador]").forEach((el) => {
        const alvo = Number(el.dataset.contador);
        const proxy = { v: 0 };
        el.textContent = "0";
        gsap.to(proxy, {
          v: alvo,
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
          onUpdate: () => {
            el.textContent = String(Math.round(proxy.v));
          },
        });
      });
    },
    { scope, dependencies: [reduceMotion] },
  );

  return (
    <section
      ref={scope}
      aria-label="Números do app"
      className="px-6 py-16 sm:py-20"
    >
      <ul className="mx-auto flex max-w-4xl flex-wrap items-start justify-center gap-x-10 gap-y-12">
        {STATS.map((s) => (
          <li
            key={s.rotulo}
            className="flex w-40 flex-col items-center gap-4 text-center"
          >
            {/* bumper plate: borracha escura no miolo, cor do grupo por
                fora, sombras internas fazendo o relevo dos anéis */}
            <div
              className="flex size-40 items-center justify-center rounded-full border border-black/40"
              style={{
                background: `radial-gradient(circle, #10131a 0 37%, ${s.cor} 37% 100%)`,
                boxShadow:
                  "inset 0 0 0 5px rgba(0,0,0,0.28), inset 0 0 26px rgba(0,0,0,0.4)",
              }}
            >
              <p className="font-display text-3xl tabular-nums text-chalk">
                {s.prefixo}
                <span data-contador={s.valor}>{s.valor}</span>
                {s.sufixo}
              </p>
            </div>
            <p className="text-sm text-pretty text-muted-foreground">
              {s.rotulo}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
