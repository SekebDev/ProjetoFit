import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { mockMatchMedia } from "../../vitest.setup";
import { ScrollTrigger } from "@/lib/gsap";
import { StatsStrip } from "./StatsStrip";

describe("StatsStrip", () => {
  afterEach(() => {
    ScrollTrigger.getAll().forEach((st) => st.kill(true));
    mockMatchMedia(false);
  });

  it("com reduced motion mostra os números finais vindos do servidor", () => {
    mockMatchMedia(true);

    render(<StatsStrip />);

    expect(screen.getByText("873")).toBeDefined();
    expect(screen.getByText("12")).toBeDefined();
    expect(screen.getByText(/exercícios ilustrados/i)).toBeDefined();
    expect(screen.getByText(/PWA instalável/i)).toBeDefined();
  });

  it("na variante animada cada contador conhece seu alvo (data-contador)", () => {
    const { container } = render(<StatsStrip />);

    const contadores = container.querySelectorAll("[data-contador]");
    expect(contadores).toHaveLength(4);
    const alvos = Array.from(contadores).map((el) =>
      el.getAttribute("data-contador"),
    );
    expect(alvos).toEqual(["873", "12", "50", "100"]);
  });
});
