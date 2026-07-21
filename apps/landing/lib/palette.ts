/**
 * Paleta do app web (apps/web/src/app/globals.css) — fonte única pro lado
 * JS (materiais three, canvas etc.). O CSS da landing usa os mesmos valores
 * em app/globals.css; o teste garante que os dois não divirjam.
 */
export const BRAND = {
  bg: "#0e1014",
  surface: "#171a21",
  surface2: "#1e222b",
  border: "#2a2f3a",
  text: "#e9ebef",
  muted: "#949aa6",
  muted2: "#6b7280",
  chalk: "#f2f4f7",
  /* cores de anilha por grupo muscular */
  chest: "#e5484d",
  back: "#3e7bfa",
  shoulders: "#e6a817",
  arms: "#9b72f2",
  legs: "#3da35d",
  core: "#22b8cf",
} as const;
