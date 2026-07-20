/** @type {import('tailwindcss').Config} */
// Tokens portados 1:1 de apps/web/src/app/globals.css — a fonte de verdade do
// design. Qualquer mudanca de paleta no web deve ser refletida aqui.
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#0e1014",
        surface: "#171a21",
        "surface-2": "#1e222b",
        border: "#2a2f3a",
        "border-soft": "#21252e",
        text: "#e9ebef",
        muted: "#949aa6",
        "muted-2": "#6b7280",
        chalk: "#f2f4f7",
        // anilha por grupo muscular
        "m-chest": "#e5484d",
        "m-back": "#3e7bfa",
        "m-shoulders": "#e6a817",
        "m-arms": "#9b72f2",
        "m-legs": "#3da35d",
        "m-core": "#22b8cf",
      },
      fontFamily: {
        display: ["SpaceGrotesk_700Bold"],
        "display-medium": ["SpaceGrotesk_500Medium"],
        body: ["IBMPlexSans_400Regular"],
        "body-medium": ["IBMPlexSans_500Medium"],
        "body-semibold": ["IBMPlexSans_600SemiBold"],
        mono: ["IBMPlexMono_400Regular"],
      },
    },
  },
  plugins: [],
};
