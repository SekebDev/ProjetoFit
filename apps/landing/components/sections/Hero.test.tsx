import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "../../vitest.setup";
import { Hero } from "./Hero";

// A cena R3F precisa de WebGL, que o jsdom não tem — o wrapper 3D vira um
// marcador. O lazy-load real (useInView) tem teste próprio.
vi.mock("@/components/three/Hero3D", () => ({
  Hero3D: () => <div data-testid="hero-3d" />,
}));

describe("Hero", () => {
  afterEach(() => {
    mockMatchMedia(false);
  });

  it("renderiza headline, CTAs e a camada 3D", () => {
    render(<Hero />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /treinar nunca foi tão viciante/i,
      }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /começar agora/i })).toBeDefined();
    // "Ver funcionalidades" virou âncora pra #funcionalidades — role link.
    expect(
      screen.getByRole("link", { name: /ver funcionalidades/i }),
    ).toBeDefined();
    expect(screen.getByTestId("hero-3d")).toBeDefined();
  });

  it("aplica o SplitText na headline (chars viram elementos)", () => {
    render(<Hero />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.querySelectorAll("div").length).toBeGreaterThan(0);
  });

  it("com prefers-reduced-motion não divide o texto: headline intacta", () => {
    mockMatchMedia(true);

    render(<Hero />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.querySelectorAll("div").length).toBe(0);
    expect(heading.textContent).toBe("Treinar nunca foi tão viciante.");
  });
});
