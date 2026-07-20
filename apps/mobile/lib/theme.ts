/**
 * Tokens do design, para onde className do NativeWind nao alcanca: opcoes de
 * navegacao, cor de icone lucide, tintColor de spinner. Espelham
 * apps/web/src/app/globals.css e tailwind.config.js.
 */
import type { MuscleGroup } from "./types";

export const colors = {
  bg: "#0e1014",
  surface: "#171a21",
  surface2: "#1e222b",
  border: "#2a2f3a",
  borderSoft: "#21252e",
  text: "#e9ebef",
  muted: "#949aa6",
  muted2: "#6b7280",
  chalk: "#f2f4f7",
} as const;

/** Anilha por grupo muscular — o unico uso de cor com significado no app. */
export const muscleColors: Record<MuscleGroup, string> = {
  CHEST: "#e5484d",
  BACK: "#3e7bfa",
  SHOULDERS: "#e6a817",
  ARMS: "#9b72f2",
  LEGS: "#3da35d",
  CORE: "#22b8cf",
};

export const fonts = {
  display: "SpaceGrotesk_700Bold",
  displayMedium: "SpaceGrotesk_500Medium",
  body: "IBMPlexSans_400Regular",
  bodyMedium: "IBMPlexSans_500Medium",
  bodySemibold: "IBMPlexSans_600SemiBold",
  mono: "IBMPlexMono_400Regular",
} as const;
