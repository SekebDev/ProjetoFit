/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#a78bfa",
        dark: "#0e1014",
        gray: {
          900: "#111827",
          800: "#1f2937",
          700: "#374151",
          600: "#4b5563",
          400: "#9ca3af",
        },
      },
    },
  },
  plugins: [],
};
