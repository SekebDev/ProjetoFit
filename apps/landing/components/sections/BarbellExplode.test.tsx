import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "../../vitest.setup";
import { ScrollTrigger } from "@/lib/gsap";
import { BarbellExplode } from "./BarbellExplode";

// A cena R3F precisa de WebGL, que o jsdom não tem — o wrapper 3D vira um
// marcador, mesmo padrão do teste do Hero.
vi.mock("@/components/three/BarbellExplode3D", () => ({
  BarbellExplode3D: () => <div data-testid="explode-3d" />,
}));

const TITULOS = [
  "Biblioteca completa",
  "Planos por IA",
  "Sessão guiada",
  "Modo Dopamina",
  "Progresso de verdade",
  "XP, conquistas e ranking",
];

describe("BarbellExplode", () => {
  afterEach(() => {
    // O pin embrulha a seção num .pin-spacer fora do React; reverter os
    // triggers ANTES do auto-cleanup do RTL devolve o DOM pro lugar.
    ScrollTrigger.getAll().forEach((st) => st.kill(true));
    mockMatchMedia(false);
  });

  it("renderiza a variante pinada com a camada 3D e os 6 cards", () => {
    render(<BarbellExplode />);

    expect(screen.getByTestId("explode-pinned")).toBeDefined();
    expect(screen.getByTestId("explode-3d")).toBeDefined();
    // Os cards nascem com autoAlpha 0 até o scrub trazê-los — getByText
    // consulta o DOM direto, sem filtrar por visibilidade.
    for (const titulo of TITULOS) {
      expect(screen.getByText(titulo)).toBeDefined();
    }
  });

  it("com prefers-reduced-motion vira grade estática, sem pin nem 3D", () => {
    mockMatchMedia(true);

    render(<BarbellExplode />);

    expect(screen.getByTestId("explode-static")).toBeDefined();
    expect(screen.queryByTestId("explode-pinned")).toBeNull();
    expect(screen.queryByTestId("explode-3d")).toBeNull();
    for (const titulo of TITULOS) {
      expect(screen.getByRole("heading", { name: titulo })).toBeDefined();
    }
  });

  it("no mobile (abaixo de lg) empilha a grade, sem pin nem 3D", () => {
    mockMatchMedia({ desktop: false });

    render(<BarbellExplode />);

    expect(screen.getByTestId("explode-static")).toBeDefined();
    expect(screen.queryByTestId("explode-pinned")).toBeNull();
    expect(screen.queryByTestId("explode-3d")).toBeNull();
    for (const titulo of TITULOS) {
      expect(screen.getByRole("heading", { name: titulo })).toBeDefined();
    }
  });
});
