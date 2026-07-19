import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "senha-de-teste-123";

/** Email descartavel — o global-teardown apaga tudo com este dominio. */
function throwawayEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@playwright.local`;
}

async function registrar(page: Page, nome: string): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: /cadastre-se/i }).click();
  await page.getByPlaceholder("Nome").fill(nome);
  await page.getByPlaceholder("E-mail").fill(throwawayEmail());
  await page.getByPlaceholder(/senha/i).fill(PASSWORD);
  await page.getByRole("button", { name: /^criar conta$/i }).click();
  await page.waitForURL("**/profile");
}

/** Cria um grupo e devolve o codigo de convite que a tela de detalhe mostra. */
async function criaGrupo(page: Page, nome: string): Promise<string> {
  await page.goto("/groups");
  await page.getByRole("button", { name: /criar um grupo/i }).click();
  await page.getByLabel("Nome do grupo").fill(nome);
  await page.getByRole("button", { name: /^criar$/i }).click();
  await page.waitForURL(/\/groups\/[^/]+$/);

  const codigo = await page.locator("code").first().innerText();
  // 8 caracteres do alfabeto sem 0/O e 1/I/L (invite-code.ts).
  expect(codigo).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
  return codigo;
}

test.describe("grupos", () => {
  test("cria um grupo e aparece no proprio ranking", async ({ page }) => {
    await registrar(page, "Dona do Grupo");
    await criaGrupo(page, "Treta da Academia");

    await expect(
      page.getByRole("heading", { name: "Treta da Academia" }),
    ).toBeVisible();
    // Membro sem treino nao some do ranking: entra com 0 XP.
    await expect(page.getByText("Dona do Grupo")).toBeVisible();
    await expect(page.getByText("0 XP")).toBeVisible();
  });

  test("segundo usuario entra pelo codigo e os dois aparecem no ranking", async ({
    browser,
  }) => {
    const contextoDona = await browser.newContext();
    const paginaDona = await contextoDona.newPage();
    await registrar(paginaDona, "Dona");
    const codigo = await criaGrupo(paginaDona, "Grupo Compartilhado");

    const contextoAmiga = await browser.newContext();
    const paginaAmiga = await contextoAmiga.newPage();
    await registrar(paginaAmiga, "Amiga");
    await paginaAmiga.goto("/groups");
    await paginaAmiga.getByLabel(/entrar com código/i).fill(codigo);
    await paginaAmiga.getByRole("button", { name: /^entrar$/i }).click();
    await paginaAmiga.waitForURL(/\/groups\/[^/]+$/);

    // Quem entrou ve as duas pessoas...
    await expect(paginaAmiga.getByText("Dona")).toBeVisible();
    await expect(paginaAmiga.getByText("Amiga")).toBeVisible();

    // ...e quem criou tambem, depois de recarregar.
    await paginaDona.reload();
    await expect(paginaDona.getByText("Amiga")).toBeVisible();
    await expect(paginaDona.getByText("2 participantes")).toBeVisible();

    await contextoDona.close();
    await contextoAmiga.close();
  });

  test("codigo inexistente explica o que houve, sem erro cru", async ({
    page,
  }) => {
    await registrar(page, "Quem Errou");
    await page.goto("/groups");
    // Tudo do alfabeto valido, entao passa no schema e chega ao banco: e um 404
    // de verdade, nao um 400 de formato.
    await page.getByLabel(/entrar com código/i).fill("ZZZZZZZZ");
    await page.getByRole("button", { name: /^entrar$/i }).click();

    // Escopado ao main: o Next monta um <div role="alert"> vazio (o
    // route-announcer) no body, e um getByRole("alert") solto pega os dois.
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      /código não encontrado/i,
    );
    await expect(page).toHaveURL(/\/groups$/);
  });

  test("metrica de sequencia trava o periodo em geral", async ({ page }) => {
    await registrar(page, "Sequencial");
    await criaGrupo(page, "Grupo da Sequencia");

    const periodos = page.getByRole("group", { name: /período do ranking/i });
    await expect(periodos.getByRole("button", { name: "Semana" })).toBeEnabled();

    await page.getByRole("button", { name: "Sequência" }).click();

    // O servidor devolve period="all" pra sequencia; a UI nao pode oferecer um
    // recorte que ninguem calculou.
    await expect(
      periodos.getByRole("button", { name: "Semana" }),
    ).toBeDisabled();
    await expect(
      periodos.getByRole("button", { name: "Geral" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("ultimo a sair apaga o grupo", async ({ page }) => {
    await registrar(page, "Sozinha");
    await criaGrupo(page, "Grupo Efemero");

    await page.getByRole("button", { name: /sair do grupo/i }).click();
    await expect(page.getByText(/o grupo será apagado/i)).toBeVisible();
    // Escopado ao main: "Sair" tambem e o botao de logout, no header.
    await page.getByRole("main").getByRole("button", { name: /^sair$/i }).click();

    await page.waitForURL(/\/groups$/);
    await expect(page.getByText("Grupo Efemero")).toHaveCount(0);
    await expect(page.getByText(/não está em nenhum grupo/i)).toBeVisible();
  });
});
