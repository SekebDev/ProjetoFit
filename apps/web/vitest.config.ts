import { defineConfig } from "vitest/config";

// Testes de unidade da logica pura (fisica dos minigames do Modo Dopamina, etc).
// Ambiente node de proposito: nao ha DOM aqui — os componentes de canvas ficam
// cobertos pelo e2e. `.test.ts` separa isto do `e2e/*.spec.ts` do Playwright.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
