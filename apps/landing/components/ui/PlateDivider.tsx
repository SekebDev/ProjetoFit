const ANILHAS = [
  { cor: "var(--m-core)", altura: "h-3" },
  { cor: "var(--m-legs)", altura: "h-5" },
  { cor: "var(--m-chest)", altura: "h-7" },
] as const;

/**
 * Divisor decorativo entre seções: uma mini-barra carregada, anilhas
 * pequenas por fora e grandes por dentro, como numa barra de verdade.
 */
export function PlateDivider() {
  return (
    <div
      aria-hidden
      className="flex items-center justify-center gap-1.5 px-6 py-6"
    >
      <span className="h-px w-16 bg-border" />
      {ANILHAS.map((a) => (
        <span
          key={`esq-${a.cor}`}
          className={`${a.altura} w-1.5 rounded-full`}
          style={{ backgroundColor: a.cor }}
        />
      ))}
      <span className="h-px w-10 bg-border" />
      {[...ANILHAS].reverse().map((a) => (
        <span
          key={`dir-${a.cor}`}
          className={`${a.altura} w-1.5 rounded-full`}
          style={{ backgroundColor: a.cor }}
        />
      ))}
      <span className="h-px w-16 bg-border" />
    </div>
  );
}
