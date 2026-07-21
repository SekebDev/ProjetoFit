import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { mockMatchMedia } from "../../vitest.setup";
import { ScrollTrigger } from "@/lib/gsap";
import { RackieSection } from "./RackieSection";

describe("RackieSection", () => {
  afterEach(() => {
    ScrollTrigger.getAll().forEach((st) => st.kill(true));
    mockMatchMedia(false);
  });

  it("apresenta a mascote com os três momentos e falas reais do app", () => {
    render(<RackieSection />);

    expect(
      screen.getByRole("heading", { name: /conheça a rackie/i }),
    ).toBeDefined();
    expect(screen.getByAltText("Rackie comemorando")).toBeDefined();
    expect(screen.getByAltText("Rackie relaxada no descanso")).toBeDefined();
    expect(screen.getByAltText("Rackie inconformada")).toBeDefined();
    // Fala vinda do pool real (apps/web/src/lib/rackie/phrases.ts).
    expect(screen.getByText(/PR NA CONTA! Agora sim, monstro!/)).toBeDefined();
  });

  it("com reduced motion mantém o conteúdo, sem animação de entrada", () => {
    mockMatchMedia(true);

    render(<RackieSection />);

    expect(
      screen.getByRole("heading", { name: /conheça a rackie/i }),
    ).toBeDefined();
    expect(ScrollTrigger.getAll()).toHaveLength(0);
  });
});
