import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInView } from "./useInView";

type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

const instances: Array<{
  cb: IOCallback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}> = [];

class IntersectionObserverStub {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(cb: IOCallback) {
    instances.push({ cb, observe: this.observe, disconnect: this.disconnect });
  }
}

function Probe() {
  const { ref, isInView } = useInView<HTMLDivElement>();
  return <div ref={ref}>{isInView ? "dentro" : "fora"}</div>;
}

describe("useInView", () => {
  beforeEach(() => {
    instances.length = 0;
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("começa fora e observa o elemento", () => {
    render(<Probe />);

    expect(screen.getByText("fora")).toBeDefined();
    expect(instances).toHaveLength(1);
    expect(instances[0].observe).toHaveBeenCalledTimes(1);
  });

  it("vira dentro na primeira interseção e para de observar", () => {
    render(<Probe />);

    act(() => {
      instances[0].cb([{ isIntersecting: true }]);
    });

    expect(screen.getByText("dentro")).toBeDefined();
    expect(instances[0].disconnect).toHaveBeenCalled();
  });

  it("ignora entradas sem interseção", () => {
    render(<Probe />);

    act(() => {
      instances[0].cb([{ isIntersecting: false }]);
    });

    expect(screen.getByText("fora")).toBeDefined();
  });
});
