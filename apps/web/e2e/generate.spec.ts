import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "senha-de-teste-123";
const ROTA_IA = "**/api/ai/plans/generate";

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

/** Salva o perfil com os defaults — sem ele o /generate nem mostra o form. */
async function preenchePerfil(page: Page): Promise<void> {
  await page.goto("/profile");
  await page.getByRole("button", { name: /salvar/i }).click();
  await expect(page.getByText(/salvo/i)).toBeVisible();
}

/**
 * Resposta da API interceptada no browser.
 *
 * O container de teste nao tem OPENAI_API_KEY (e nem deveria: chave de verdade
 * em teste custa dinheiro e nao e deterministica). Pro caminho feliz a resposta
 * e dublada aqui; pro caminho degradado a API responde 503 sozinha e o teste
 * nao precisa fingir nada.
 */
async function dublaResposta(
  page: Page,
  status: number,
  body: unknown,
): Promise<void> {
  await page.route(ROTA_IA, (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    }),
  );
}

function planoGerado() {
  return {
    id: "plano-gerado-1",
    name: "Plano da IA",
    notes: "Foco em hipertrofia.",
    source: "AI",
    isActive: false,
    createdAt: new Date().toISOString(),
    days: [],
  };
}

test.describe("Gerar plano por IA", () => {
  test("o /plans oferece o caminho da IA", async ({ page }) => {
    await registrar(page);
    await page.goto("/plans");

    // Sem plano nenhum, a tela vazia oferece as duas saidas.
    await expect(
      page.getByRole("link", { name: /gerar por ia/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /criar na mão/i }),
    ).toBeVisible();

    await page.getByRole("link", { name: /gerar por ia/i }).first().click();
    await page.waitForURL("**/generate");

    await expect(
      page.getByRole("heading", { name: /gerar plano/i }),
    ).toBeVisible();
  });

  test("sem perfil, manda preencher em vez de deixar falhar", async ({
    page,
  }) => {
    await registrar(page);
    await page.goto("/generate");

    await expect(
      page.getByText(/a ia precisa saber seu objetivo/i),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /gerar plano/i })).toBeHidden();
    await expect(
      page.getByRole("link", { name: /preencher perfil/i }),
    ).toBeVisible();
  });

  test("com perfil, mostra o que sera enviado antes de gerar", async ({
    page,
  }) => {
    await registrar(page);
    await preenchePerfil(page);
    await page.goto("/generate");

    await expect(
      page.getByRole("heading", { name: /o que a ia vai considerar/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /gerar plano/i }),
    ).toBeVisible();
  });

  // O estado real de quem nao configurou a chave — inclusive este container.
  test("sem a chave configurada, explica em vez de dar erro generico", async ({
    page,
  }) => {
    await registrar(page);
    await preenchePerfil(page);
    await page.goto("/generate");

    await page.getByRole("button", { name: /gerar plano/i }).click();

    await expect(page.getByText(/não está configurada/i)).toBeVisible();
    // E aponta a saida que ainda existe.
    await expect(page.getByText(/montar um plano manualmente/i)).toBeVisible();
  });

  test("gerou, vai direto pro plano criado", async ({ page }) => {
    await registrar(page);
    await preenchePerfil(page);
    await dublaResposta(page, 201, planoGerado());

    await page.goto("/generate");
    await page.getByLabel(/algum pedido/i).fill("quero focar em ombro");
    await page.getByRole("button", { name: /gerar plano/i }).click();

    await page.waitForURL("**/plans/plano-gerado-1");
  });

  test("limite de geracoes diz o que houve, e nao 'erro'", async ({ page }) => {
    await registrar(page);
    await preenchePerfil(page);
    await dublaResposta(page, 429, { message: "ThrottlerException" });

    await page.goto("/generate");
    await page.getByRole("button", { name: /gerar plano/i }).click();

    await expect(page.getByText(/limite de gerações desta hora/i)).toBeVisible();
  });

  test("IA sem conseguir montar um plano valido vira mensagem clara", async ({
    page,
  }) => {
    await registrar(page);
    await preenchePerfil(page);
    await dublaResposta(page, 502, { message: "Bad Gateway" });

    await page.goto("/generate");
    await page.getByRole("button", { name: /gerar plano/i }).click();

    await expect(page.getByText(/não conseguiu montar um plano/i)).toBeVisible();
  });

  test("exige login pra gerar", async ({ page }) => {
    await page.goto("/generate");

    await expect(page.getByText(/entre para gerar um plano/i)).toBeVisible();
  });
});
