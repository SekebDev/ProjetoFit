import { renderHook } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { mockMatchMedia } from "../vitest.setup";
import { useIsDesktop } from "./useIsDesktop";

describe("useIsDesktop", () => {
  afterEach(() => {
    mockMatchMedia(false);
  });

  it("true quando a media query de largura casa (desktop)", () => {
    mockMatchMedia({ desktop: true });

    const { result } = renderHook(() => useIsDesktop());

    expect(result.current).toBe(true);
  });

  it("false quando não casa (mobile)", () => {
    mockMatchMedia({ desktop: false });

    const { result } = renderHook(() => useIsDesktop());

    expect(result.current).toBe(false);
  });

  // Regressão do pin-spacer fantasma: se o snapshot de servidor voltar a ser
  // true, o mobile monta a variante pinada por um instante na hidratação, o
  // GSAP injeta um .pin-spacer gigante e a troca pra estático o deixa órfão
  // (zona morta de scroll). O SSR TEM que renderizar mobile-first (false).
  it("no SSR assume mobile (false), sem tocar em matchMedia", () => {
    function Probe() {
      return <span>{useIsDesktop() ? "desktop" : "mobile"}</span>;
    }

    const html = renderToStaticMarkup(<Probe />);

    expect(html).toContain("mobile");
  });
});
