"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export const MASCOT_NAME = "Rackie";

/** Estados da mascote. cheer/rest/sad sao usados a partir das Fases 3 e 7. */
export type MascotState = "idle" | "sleep" | "cheer" | "rest" | "sad";

const SIZES = { sm: 72, md: 128, lg: 208 } as const;

interface Props {
  state?: MascotState;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * Renderiza a mascote. Enquanto a arte nao existir em /public/mascot/,
 * cai numa silhueta placeholder em vez de quebrar o layout.
 */
export function Mascot({ state = "idle", size = "md", className }: Props) {
  const [failed, setFailed] = useState(false);
  const px = SIZES[size];

  if (failed) {
    return <MascotPlaceholder px={px} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/mascot/${state}.png`}
      alt=""
      aria-hidden
      width={px}
      height={px}
      onError={() => setFailed(true)}
      className={cn("select-none object-contain", className)}
      style={{ width: px, height: px }}
      draggable={false}
    />
  );
}

/** Silhueta neutra: marca o lugar da arte sem fingir ser a arte final. */
function MascotPlaceholder({ px, className }: { px: number; className?: string }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      aria-hidden
      className={cn("select-none opacity-40", className)}
    >
      <circle cx="50" cy="34" r="24" fill="var(--border)" />
      <path
        d="M28 92c0-14 10-24 22-24s22 10 22 24z"
        fill="var(--border)"
      />
      <circle cx="42" cy="34" r="3" fill="var(--muted-2)" />
      <circle cx="58" cy="34" r="3" fill="var(--muted-2)" />
      <rect
        x="4"
        y="4"
        width="92"
        height="92"
        rx="8"
        fill="none"
        stroke="var(--border)"
        strokeDasharray="4 4"
      />
    </svg>
  );
}
