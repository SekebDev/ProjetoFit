import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { mockMatchMedia } from "../../vitest.setup";
import { ScrollTrigger } from "@/lib/gsap";
import { Features } from "./Features";

const TITULOS = [
  "Planos gerados por IA",
  "Progressão automática",
  "Treino em grupo",
  "Modo Dopamina",
];

describe("Features", () => {
  afterEach(() => {
    // O pin embrulha a seção num .pin-spacer fora do React; reverter os
    // triggers ANTES do auto-cleanup do RTL (este afterEach roda primeiro,
    // LIFO) devolve o DOM pro lugar e o unmount não quebra.
    ScrollTrigger.getAll().forEach((st) => st.kill(true));
    mockMatchMedia(false);
  });

  it("renderiza a variante pinada com as 4 features", () => {
    render(<Features />);

    expect(screen.getByTestId("features-pinned")).toBeDefined();
    // Fora a primeira, as features começam com autoAlpha 0 (visibility
    // hidden) até o scrub trazê-las — getByText consulta o DOM direto,
    // sem filtrar por visibilidade como o getByRole faz.
    for (const titulo of TITULOS) {
      expect(screen.getByText(titulo)).toBeDefined();
    }
  });

  it("com prefers-reduced-motion vira grade estática, sem pin", () => {
    mockMatchMedia(true);

    render(<Features />);

    expect(screen.getByTestId("features-static")).toBeDefined();
    expect(screen.queryByTestId("features-pinned")).toBeNull();
    for (const titulo of TITULOS) {
      expect(screen.getByRole("heading", { name: titulo })).toBeDefined();
    }
  });

  it("no mobile (abaixo de lg) vira grade estática, sem pin", () => {
    mockMatchMedia({ desktop: false });

    render(<Features />);

    expect(screen.getByTestId("features-static")).toBeDefined();
    expect(screen.queryByTestId("features-pinned")).toBeNull();
    for (const titulo of TITULOS) {
      expect(screen.getByRole("heading", { name: titulo })).toBeDefined();
    }
  });
});
