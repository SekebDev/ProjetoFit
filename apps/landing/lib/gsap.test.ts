import { describe, expect, it } from "vitest";
import { ScrollTrigger, SplitText, gsap } from "./gsap";

// Os tipos do gsap não declaram core.globals(), mas ela existe em runtime.
function gsapGlobals(): Record<string, unknown> {
  const core = gsap.core as unknown as {
    globals: () => Record<string, unknown>;
  };
  return core.globals();
}

describe("lib/gsap", () => {
  it("registra o ScrollTrigger no núcleo do gsap", () => {
    expect(gsapGlobals().ScrollTrigger).toBe(ScrollTrigger);
  });

  // SplitText não entra em core.globals(); a prova de registro é funcionar.
  it("SplitText registrado divide texto em chars", () => {
    const el = document.createElement("p");
    el.textContent = "Landing";
    document.body.appendChild(el);

    const split = new SplitText(el, { type: "chars" });

    expect(split.chars).toHaveLength(7);
    split.revert();
    el.remove();
  });

  it("não registra ScrollSmoother — o smooth scroll é do Lenis", () => {
    expect(gsapGlobals().ScrollSmoother).toBeUndefined();
  });
});
