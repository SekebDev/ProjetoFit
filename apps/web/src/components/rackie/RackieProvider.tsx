"use client";

import { AnimatePresence } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { MascotState } from "@/components/Mascot";
import {
  ENTRADAS,
  type Entrada,
  RackieBubble,
} from "@/components/rackie/RackieBubble";
import { fireConfetti } from "@/lib/rackie/confetti";
import { pickPhrase, type RackieContext } from "@/lib/rackie/phrases";

/** Quanto tempo o balao fica na tela antes de sumir sozinho. */
const DURACAO_MS = 2200;

/** Pose, anuncio e estouro de confete de cada contexto. */
const APRESENTACAO: Record<
  RackieContext,
  { state: MascotState; announce: boolean; burst: boolean }
> = {
  set: { state: "cheer", announce: false, burst: true },
  pr: { state: "cheer", announce: true, burst: true },
  day: { state: "cheer", announce: true, burst: true },
  rest: { state: "rest", announce: false, burst: false },
  levelUp: { state: "cheer", announce: true, burst: true },
  achievement: { state: "cheer", announce: true, burst: true },
  // Perder posicao nao se comemora: pose triste e nada de confete. A tela de
  // ranking mostra esse contexto numa faixa fixa em vez do balao (o balao some
  // em 2,2s e o aviso precisa continuar ali enquanto a pessoa le o ranking),
  // mas a entrada existe pra que `say("overtaken")` nunca fique sem pose.
  overtaken: { state: "sad", announce: true, burst: false },
};

interface Fala {
  id: number;
  phrase: string;
  state: MascotState;
  announce: boolean;
  entrada: Entrada;
}

interface RackieApi {
  /** Faz a Rackie aparecer com uma frase daquele contexto. */
  say: (context: RackieContext) => void;
}

const Ctx = createContext<RackieApi | null>(null);

/**
 * Segura UMA fala da Rackie por vez. Um `say` novo substitui a fala anterior
 * (a mais recente vence) e reinicia o timer — series em sequencia so trocam a
 * frase, sem empilhar baloes. Fora de qualquer <RackieProvider>, `useRackie`
 * vira no-op pra nunca quebrar quem chama.
 */
export function RackieProvider({ children }: { children: React.ReactNode }) {
  const [fala, setFala] = useState<Fala | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proxId = useRef(0);
  // Ultima frase mostrada por contexto, pra nao sortear a mesma duas vezes.
  const ultima = useRef<Partial<Record<RackieContext, string>>>({});

  const say = useCallback((context: RackieContext) => {
    const phrase = pickPhrase(context, ultima.current[context]);
    ultima.current[context] = phrase;
    const { state, announce, burst } = APRESENTACAO[context];

    proxId.current += 1;
    // Entrada rotaciona por contador: series seguidas ganham poses diferentes.
    const entrada = ENTRADAS[proxId.current % ENTRADAS.length];
    setFala({ id: proxId.current, phrase, state, announce, entrada });

    if (burst) fireConfetti(context);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFala(null), DURACAO_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <Ctx.Provider value={{ say }}>
      {children}
      <AnimatePresence>
        {fala ? (
          <RackieBubble
            key={fala.id}
            phrase={fala.phrase}
            state={fala.state}
            entrada={fala.entrada}
            announce={fala.announce}
          />
        ) : null}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

/** Acesso a Rackie. No-op seguro se nao houver provider acima. */
export function useRackie(): RackieApi {
  return useContext(Ctx) ?? NOOP;
}

const NOOP: RackieApi = { say: () => {} };
