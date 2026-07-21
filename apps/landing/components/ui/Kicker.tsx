import { cn } from "@/lib/utils";

interface KickerProps {
  children: React.ReactNode;
  /** cor da barrinha de anilha ao lado do texto */
  cor?: string;
  className?: string;
}

/**
 * Eyebrow padrão das seções: uma barrinha vertical na cor de anilha da
 * seção + texto mono espaçado. A barrinha amarra cada seção à paleta de
 * grupos musculares — mesmo código visual da barra 3D.
 */
export function Kicker({
  children,
  cor = "var(--chalk)",
  className,
}: KickerProps) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className="h-3.5 w-1 shrink-0 rounded-[1px]"
        style={{ backgroundColor: cor }}
      />
      {children}
    </p>
  );
}
