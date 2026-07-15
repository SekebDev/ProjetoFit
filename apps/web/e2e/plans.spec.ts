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

test.describe("Planos", () => {
  test("cria um plano, ativa, e ele aparece na lista", async ({ page }) => {
    await registrar(page);

    await page.goto("/plans/new");
    await page.getByPlaceholder("Push / Pull / Legs").fill("Plano E2E");

    // O primeiro dia ja vem aberto num plano novo.
    await page.getByRole("button", { name: /adicionar exercício/i }).click();

    const sheet = page.getByRole("dialog", { name: /escolher exercício/i });
    await expect(sheet).toBeVisible();
    await sheet.getByPlaceholder(/buscar exercício/i).fill("bench");
    await sheet.getByRole("button").filter({ hasText: /press/i }).first().click();
    await expect(sheet).toBeHidden();

    // Exercicio entrou no dia, com os defaults preenchidos.
    await expect(page.getByLabel("Séries")).toHaveValue("3");
    await expect(page.getByLabel("Reps")).toHaveValue("8-12");

    await page.getByRole("button", { name: /criar plano/i }).click();

    await page.waitForURL(/\/plans\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { name: "Plano E2E" })).toBeVisible();

    await page.getByRole("button", { name: /tornar plano ativo/i }).click();
    await expect(page.getByText(/este é o seu plano ativo/i)).toBeVisible();

    await page.goto("/plans");
    const card = page.getByRole("listitem").filter({ hasText: "Plano E2E" });
    await expect(card).toBeVisible();
    await expect(card.getByText("ativo")).toBeVisible();
  });

  test("bloqueia o envio enquanto um dia estiver vazio", async ({ page }) => {
    await registrar(page);
    await page.goto("/plans/new");
    await page.getByPlaceholder("Push / Pull / Legs").fill("Incompleto");

    await expect(
      page.getByRole("button", { name: /criar plano/i }),
    ).toBeDisabled();
    await expect(
      page.getByText(/todo dia precisa de pelo menos um exercício/i),
    ).toBeVisible();
  });
});

test.describe("Navegacao mobile", () => {
  test("a bottom-tab aparece no mobile e some no desktop", async ({
    page,
  }, testInfo) => {
    await page.goto("/exercises");
    const tabs = page.getByRole("navigation", { name: /navegação principal/i });

    if (testInfo.project.name === "mobile") {
      await expect(tabs).toBeVisible();
      // Alvo de toque: minimo recomendado e 44px.
      const box = await tabs.getByRole("link").first().boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    } else {
      await expect(tabs).toBeHidden();
    }
  });

  test("a pagina nao rola na horizontal no mobile", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "so no mobile");
    await page.goto("/exercises");
    await page.waitForLoadState("networkidle");

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
