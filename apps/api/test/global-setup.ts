import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { TEST_DATABASE_URL } from "./test-db";

const REPO_ROOT = resolve(__dirname, "../../..");
const API_DIR = resolve(__dirname, "..");

/**
 * Prepara o banco de teste antes da suite E2E.
 *
 * `workout_test` e um banco separado do `workout` de dev de proposito: estes
 * testes limpam tabelas, e a biblioteca de exercicios do dev nao pode ser
 * colateral disso.
 */
export default async function setup(): Promise<void> {
  // CREATE DATABASE nao aceita IF NOT EXISTS no Postgres; rodar de novo com o
  // banco ja criado da erro 42P04, que aqui e sucesso.
  try {
    execFileSync(
      "docker",
      [
        "compose",
        "exec",
        "-T",
        "db",
        "psql",
        "-U",
        "workout",
        "-d",
        "workout",
        "-c",
        "CREATE DATABASE workout_test",
      ],
      { cwd: REPO_ROOT, stdio: "pipe" },
    );
  } catch (err) {
    const output = String((err as { stderr?: Buffer }).stderr ?? "");
    if (!output.includes("already exists")) {
      throw new Error(
        `Nao consegui criar o banco de teste. O container 'db' esta de pe? (docker compose up -d db)\n${output}`,
      );
    }
  }

  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    cwd: API_DIR,
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    shell: process.platform === "win32",
  });
}
