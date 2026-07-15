import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Mobile primeiro: e o alvo principal do design.
    { name: "mobile", use: { ...devices["Pixel 5"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  // Reusa o stack que ja estiver de pe (docker compose up ou pnpm dev);
  // se nao houver nada na 3000, sobe um.
  webServer: {
    command: "pnpm dev",
    cwd: "../..",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
