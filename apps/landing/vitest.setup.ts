import { vi } from "vitest";

interface MatchMediaOptions {
  /** (prefers-reduced-motion: reduce) */
  reducedMotion?: boolean;
  /** (min-width: …) — o breakpoint de desktop do useIsDesktop */
  desktop?: boolean;
}

/**
 * O jsdom não implementa matchMedia nem ResizeObserver, e o Lenis usa os
 * dois. O mock responde por query: reduced-motion e o breakpoint de desktop
 * são independentes. O overload booleano continua significando "reduced
 * motion ligado/desligado" (desktop assume true) pra não quebrar os testes
 * antigos.
 */
export function mockMatchMedia(arg: boolean | MatchMediaOptions = false): void {
  const opts: MatchMediaOptions =
    typeof arg === "boolean" ? { reducedMotion: arg } : arg;
  const reducedMotion = opts.reducedMotion ?? false;
  const desktop = opts.desktop ?? true;

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => {
      const matches = query.includes("prefers-reduced-motion")
        ? reducedMotion
        : query.includes("min-width")
          ? desktop
          : false;
      return {
        matches,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
}

mockMatchMedia(false);

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
