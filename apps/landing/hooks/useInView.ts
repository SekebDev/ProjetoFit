"use client";

import { useEffect, useRef, useState } from "react";

/**
 * True a partir da primeira vez que o elemento entra no viewport — e fica
 * true: serve pra montar coisas pesadas (a cena 3D) uma vez só, sem
 * desmontar ao rolar pra longe.
 */
export function useInView<T extends Element>(rootMargin = "200px") {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsInView(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return { ref, isInView };
}
