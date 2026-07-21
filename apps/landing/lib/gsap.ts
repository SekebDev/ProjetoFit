import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

/**
 * Registro central de plugins GSAP — importe gsap/ScrollTrigger/SplitText
 * SEMPRE daqui, nunca de "gsap/*" direto, pra garantir que registerPlugin
 * rodou antes de qualquer uso.
 *
 * ScrollSmoother fica de fora de propósito: o smooth scroll é do Lenis
 * (lib/lenis.tsx), e os dois brigariam pelo controle do scroll.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export { gsap, ScrollTrigger, SplitText };
