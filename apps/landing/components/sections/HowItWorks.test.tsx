import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { mockMatchMedia } from "../../vitest.setup";
import { ScrollTrigger } from "@/lib/gsap";
import { HowItWorks } from "./HowItWorks";

const TITULOS = [
  "Conte quem você é",
  "A IA gera seu plano",
  "Treine com a Rackie",
  "Veja o progresso",
];

describe("HowItWorks", () => {
  afterEach(() => {
    ScrollTrigger.getAll().forEach((st) => st.kill(true));
    mockMatchMedia(false);
  });

  it("renderiza os 4 passos do fluxo do app", () => {
    render(<HowItWorks />);

    expect(
      screen.getByRole("heading", { name: /como funciona/i }),
    ).toBeDefined();
    for (const titulo of TITULOS) {
      expect(screen.getByRole("heading", { name: titulo })).toBeDefined();
    }
  });

  it("com reduced motion mantém os passos, sem animação de entrada", () => {
    mockMatchMedia(true);

    render(<HowItWorks />);

    for (const titulo of TITULOS) {
      expect(screen.getByRole("heading", { name: titulo })).toBeDefined();
    }
    expect(ScrollTrigger.getAll()).toHaveLength(0);
  });
});
