import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "senha-de-teste-123";

/** Email descartavel — o global-teardown apaga tudo com este dominio. */
function throwawayEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@playwright.local`;
}

async function registrar(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: /cadastre-se/i }).click();
  await page.getByPlaceholder("Nome").fill("Teste E2E");
  await page.getByPlaceholder("E-mail").fill(throwawayEmail());
  await page.getByPlaceholder(/senha/i).fill(PASSWORD);
  await page.getByRole("button", { name: /^criar conta$/i }).click();
  await page.waitForURL("**/profile");
}

/**
 * Um treino encerrado — pre-requisito pra /progress mostrar qualquer coisa.
 *
 * A tela e gatilhada por totalSessions > 0 (progress/page.tsx): sem treino ela
 * inteira vira o estado vazio, e o card de peso corporal nem existe no DOM.
 */
async function treinaUmaVez(page: Page): Promise<void> {
  await page.goto("/plans/new");
  await page.getByPlaceholder("Push / Pull / Legs").fill("Perfil E2E");
  await page.getByRole("button", { name: /adicionar exercício/i }).click();
  const sheet = page.getByRole("dialog", { name: /escolher exercício/i });
  await sheet.getByPlaceholder(/buscar exercício/i).fill("bench");
  await sheet.getByRole("button").filter({ hasText: /press/i }).first().click();
  await expect(sheet).toBeHidden();
  await page.getByRole("button", { name: /criar plano/i }).click();
  await expect(page.getByRole("heading", { name: "Perfil E2E" })).toBeVisible();

  await page.getByRole("link", { name: /treinar/i }).first().click();
  await page.waitForURL(/\/workout\/[a-z0-9]+$/);
  await page.getByLabel("Carga da série 1 em kg").fill("60");
  await page.getByLabel("Repetições da série 1").fill("10");
  await page.getByRole("button", { name: /^Registrar série 1$/ }).click();
  await page.getByRole("button", { name: /encerrar treino/i }).click();
  await page.getByRole("button", { name: /^confirmar$/i }).click();
  await expect(
    page.getByRole("heading", { name: /treino concluído/i }),
  ).toBeVisible();
}

test.describe("Perfil — configurações avançadas", () => {
  test("comeca fechado e abre no clique", async ({ page }) => {
    await registrar(page);

    // Fechado: o conteudo existe no DOM mas nao esta visivel.
    await expect(page.getByLabel(/cintura/i)).toBeHidden();

    await page.getByText(/configurações avançadas/i).click();

    await expect(page.getByLabel(/cintura/i)).toBeVisible();
    await expect(page.getByLabel(/gordura/i)).toBeVisible();
    await expect(page.getByLabel(/massa magra/i)).toBeVisible();
  });

  test("registra as medidas e elas viram o placeholder da proxima vez", async ({
    page,
  }) => {
    await registrar(page);
    await page.getByText(/configurações avançadas/i).click();

    await page.getByLabel(/cintura/i).fill("84");
    await page.getByLabel(/braço/i).fill("38");
    await page.getByRole("button", { name: /registrar medidas/i }).click();

    // Limpou os campos = gravou.
    await expect(page.getByLabel(/cintura/i)).toHaveValue("");

    // E o valor gravado volta como placeholder — o "onde eu estou".
    await expect(page.getByLabel(/cintura/i)).toHaveAttribute(
      "placeholder",
      "84",
    );
    await expect(page.getByLabel(/braço/i)).toHaveAttribute("placeholder", "38");
  });

  test("nao deixa registrar sem preencher nada", async ({ page }) => {
    await registrar(page);
    await page.getByText(/configurações avançadas/i).click();

    await expect(
      page.getByRole("button", { name: /registrar medidas/i }),
    ).toBeDisabled();
  });

  test("recusa medida fora da faixa", async ({ page }) => {
    await registrar(page);
    await page.getByText(/configurações avançadas/i).click();

    // 800cm de cintura e dedo escorregado, nao anatomia.
    await page.getByLabel(/cintura/i).fill("800");

    await expect(page.getByText(/confira cintura/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /registrar medidas/i }),
    ).toBeDisabled();
  });

  // O ponto da decisao "avancado le/registra o mesmo BodyMetric": um dado so,
  // dois lugares de acesso. Estes dois testes provam a ida e a volta.
  test("o peso registrado aqui aparece no /progress", async ({ page }) => {
    await registrar(page);
    await treinaUmaVez(page);

    await page.goto("/profile");
    await page.getByText(/configurações avançadas/i).click();
    await page.getByLabel(/^peso/i).fill("82,5");
    await page.getByRole("button", { name: /registrar medidas/i }).click();
    await expect(page.getByLabel(/^peso/i)).toHaveValue("");

    await page.goto("/progress");

    await expect(page.getByText(/82,5 kg na última/i)).toBeVisible();
  });

  test("o peso registrado no /progress aparece aqui", async ({ page }) => {
    await registrar(page);
    await treinaUmaVez(page);

    await page.goto("/progress");
    await page.getByLabel(/peso \(kg\)/i).fill("80");
    await page.getByRole("button", { name: /^registrar$/i }).click();
    await expect(page.getByText(/80 kg na última/i)).toBeVisible();

    await page.goto("/profile");
    await page.getByText(/configurações avançadas/i).click();

    await expect(page.getByLabel(/^peso/i)).toHaveAttribute("placeholder", "80");
  });
});
