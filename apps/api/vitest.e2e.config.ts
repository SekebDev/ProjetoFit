import { randomBytes } from "node:crypto";
import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./test/test-db";

// Gerado por execucao: nao existe segredo literal no repositorio, e os tokens
// de uma rodada nao valem na seguinte.
const JWT_SECRET = randomBytes(32).toString("hex");

/** E2E roda contra um Postgres REAL, no banco separado `workout_test`. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.e2e-spec.ts"],
    globalSetup: ["./test/global-setup.ts"],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET,
      JWT_EXPIRES_IN: "1h",
    },
    // Um banco compartilhado nao aguenta arquivos em paralelo limpando tabelas.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
