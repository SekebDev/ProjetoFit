import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");

/**
 * O E2E de browser roda contra o stack de dev (e o banco de dev), porque e o
 * app real que queremos exercitar. Para nao deixar lixo, todo usuario criado
 * usa o dominio @playwright.local e e apagado aqui — os cascades de
 * User -> WorkoutPlan e User -> WorkoutSession -> SetLog levam junto os planos,
 * as sessoes de treino e as series registradas.
 *
 * A tabela Exercise nunca e tocada: o teste so le a biblioteca.
 */
export default async function teardown(): Promise<void> {
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
        `DELETE FROM "User" WHERE email LIKE 'e2e-%@playwright.local'`,
      ],
      { cwd: REPO_ROOT, stdio: "pipe" },
    );
  } catch (err) {
    // Falhar a limpeza nao pode reprovar a suite; so avisa.
    console.warn(
      "[e2e] nao consegui limpar os usuarios de teste:",
      String((err as { stderr?: Buffer }).stderr ?? err),
    );
  }
}
