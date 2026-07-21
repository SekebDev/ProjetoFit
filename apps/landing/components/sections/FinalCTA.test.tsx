import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { mockMatchMedia } from "../../vitest.setup";
import { ScrollTrigger } from "@/lib/gsap";
import { FinalCTA } from "./FinalCTA";

describe("FinalCTA", () => {
  afterEach(() => {
    ScrollTrigger.getAll().forEach((st) => st.kill(true));
    mockMatchMedia(false);
  });

  it("renderiza a headline de fechamento e o CTA", () => {
    render(<FinalCTA />);

    expect(
      screen.getByRole("heading", { name: /bora treinar/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /começar agora/i }),
    ).toBeDefined();
  });

  it("com reduced motion nada anima e o conteúdo já nasce visível", () => {
    mockMatchMedia(true);

    render(<FinalCTA />);

    expect(
      screen.getByRole("heading", { name: /bora treinar/i }),
    ).toBeDefined();
    expect(ScrollTrigger.getAll()).toHaveLength(0);
  });
});
