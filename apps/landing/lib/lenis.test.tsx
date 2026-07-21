import { render, screen } from "@testing-library/react";
import Lenis from "lenis";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "../vitest.setup";
import { gsap } from "./gsap";
import { LenisProvider, useLenis } from "./lenis";

function Probe() {
  const lenis = useLenis();
  return <span>{lenis ? "smooth" : "nativo"}</span>;
}

describe("LenisProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(false);
  });

  it("cria o Lenis e expõe a instância via useLenis", async () => {
    render(
      <LenisProvider>
        <Probe />
      </LenisProvider>,
    );

    expect(await screen.findByText("smooth")).toBeDefined();
  });

  it("dirige o Lenis pelo gsap.ticker (raf em ms) e zera o lagSmoothing", async () => {
    const tickerAdd = vi.spyOn(gsap.ticker, "add");
    const lagSmoothing = vi.spyOn(gsap.ticker, "lagSmoothing");
    const holder: { current: Lenis | null } = { current: null };
    function Capture() {
      const lenis = useLenis();
      // Escrever no holder dentro do effect (não no render) respeita as
      // regras de pureza do React.
      useEffect(() => {
        holder.current = lenis;
      }, [lenis]);
      return <span>{lenis ? "smooth" : "nativo"}</span>;
    }

    render(
      <LenisProvider>
        <Capture />
      </LenisProvider>,
    );
    await screen.findByText("smooth");

    expect(tickerAdd).toHaveBeenCalledTimes(1);
    expect(lagSmoothing).toHaveBeenCalledWith(0);
    expect(holder.current).not.toBeNull();

    // raf é campo de instância no Lenis (arrow), então o spy vai na
    // instância capturada, não no protótipo.
    const raf = vi.spyOn(holder.current!, "raf");
    // O callback registrado converte segundos (gsap) em ms (Lenis).
    const drive = tickerAdd.mock.calls[0][0];
    drive(2, 16, 1, 0);
    expect(raf).toHaveBeenCalledWith(2000);
  });

  it("com prefers-reduced-motion não cria Lenis: scroll nativo", async () => {
    mockMatchMedia(true);
    const tickerAdd = vi.spyOn(gsap.ticker, "add");

    render(
      <LenisProvider>
        <Probe />
      </LenisProvider>,
    );

    expect(await screen.findByText("nativo")).toBeDefined();
    expect(tickerAdd).not.toHaveBeenCalled();
  });

  it("ao desmontar destrói o Lenis e sai do ticker", async () => {
    const destroy = vi.spyOn(Lenis.prototype, "destroy");
    const tickerAdd = vi.spyOn(gsap.ticker, "add");
    const tickerRemove = vi.spyOn(gsap.ticker, "remove");

    const { unmount } = render(
      <LenisProvider>
        <Probe />
      </LenisProvider>,
    );
    await screen.findByText("smooth");

    unmount();

    expect(destroy).toHaveBeenCalledTimes(1);
    // O gsap chama ticker.remove internamente também; o que importa é que
    // O NOSSO callback saiu do ticker.
    const drive = tickerAdd.mock.calls[0][0];
    expect(tickerRemove).toHaveBeenCalledWith(drive);
  });
});
