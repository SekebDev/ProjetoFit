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

/** Cria um plano de um dia com um exercicio e devolve a URL da tela do plano. */
async function criaPlano(page: Page, nome: string): Promise<string> {
  await page.goto("/plans/new");
  await page.getByPlaceholder("Push / Pull / Legs").fill(nome);
  await page.getByRole("button", { name: /adicionar exercício/i }).click();

  const sheet = page.getByRole("dialog", { name: /escolher exercício/i });
  await sheet.getByPlaceholder(/buscar exercício/i).fill("bench");
  await sheet.getByRole("button").filter({ hasText: /press/i }).first().click();
  await expect(sheet).toBeHidden();

  await page.getByRole("button", { name: /criar plano/i }).click();
  await expect(page.getByRole("heading", { name: nome })).toBeVisible();
  return page.url();
}

/** Treina uma serie com a carga dada e encerra — e o que vira historico. */
async function treinaEEncerra(page: Page, kg: string): Promise<void> {
  await page.getByRole("link", { name: /treinar/i }).first().click();
  await page.waitForURL(/\/workout\/[a-z0-9]+$/);

  await page.getByLabel("Carga da série 1 em kg").fill(kg);
  await page.getByLabel("Repetições da série 1").fill("10");
  await page.getByRole("button", { name: /^Registrar série 1$/ }).click();
  await expect(page.getByText("1/3 séries")).toBeVisible();

  await page.getByRole("button", { name: /encerrar treino/i }).click();
  await page.getByRole("button", { name: /^confirmar$/i }).click();
  await expect(
    page.getByRole("heading", { name: /treino concluído/i }),
  ).toBeVisible();
}

test.describe("Progresso", () => {
  test("treino encerrado aparece no resumo e vira recorde", async ({
    page,
  }) => {
    await registrar(page);
    await criaPlano(page, "Progresso E2E");
    await treinaEEncerra(page, "60");

    await page.goto("/progress");

    // O treino contou.
    await expect(
      page.getByRole("heading", { name: /volume semanal/i }),
    ).toBeVisible();
    await expect(page.getByText(/1 treino até agora/i)).toBeVisible();

    // E virou PR: 60kg e a maior carga registrada.
    await expect(page.getByRole("heading", { name: /recordes/i })).toBeVisible();
    await expect(page.getByText("60 kg").first()).toBeVisible();
  });

  test("quem nunca treinou ve o vazio, nao um grafico em branco", async ({
    page,
  }) => {
    await registrar(page);

    await page.goto("/progress");

    await expect(page.getByText(/nenhum treino encerrado ainda/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /volume semanal/i }),
    ).toBeHidden();
  });

  // A promessa do grafico de carga: bater o recorde tem que ser visivel.
  test("bater a carga atualiza o recorde", async ({ page }) => {
    await registrar(page);
    const urlPlano = await criaPlano(page, "Recorde E2E");

    await treinaEEncerra(page, "60");
    await page.goto(urlPlano);
    await treinaEEncerra(page, "80");

    await page.goto("/progress");

    await expect(page.getByText("80 kg").first()).toBeVisible();
    await expect(page.getByText(/2 treinos até agora/i)).toBeVisible();
  });

  test("registra o peso corporal e ele aparece no resumo", async ({ page }) => {
    await registrar(page);
    await criaPlano(page, "Peso E2E");
    await treinaEEncerra(page, "60");

    await page.goto("/progress");

    await page.getByLabel(/peso \(kg\)/i).fill("82,5");
    await page.getByRole("button", { name: /^registrar$/i }).click();

    // Virgula, nao ponto: o app e pt-BR e o usuario digitou "82,5". Ver o
    // formataKg em progress/page.tsx.
    await expect(page.getByText(/82,5 kg na última/i)).toBeVisible();
  });

  test("o historico lista o treino encerrado", async ({ page }) => {
    await registrar(page);
    await criaPlano(page, "Historico E2E");
    await treinaEEncerra(page, "60");

    // Pelo link de dentro de /progress: e o unico caminho ate /history, ja que
    // ela nao tem aba propria.
    await page.goto("/progress");
    await page.getByRole("link", { name: /histórico/i }).click();
    await page.waitForURL("**/history");

    await expect(
      page.getByRole("heading", { name: /^histórico$/i }),
    ).toBeVisible();
    // "Dia 1" e o nome que o PlanEditor da ao primeiro dia (PlanEditor.tsx:79).
    await expect(page.getByRole("heading", { name: "Dia 1" })).toBeVisible();
  });

  test("o historico ignora a sessao ainda aberta", async ({ page }) => {
    await registrar(page);
    await criaPlano(page, "Aberta E2E");

    // Abre o treino mas nao encerra.
    await page.getByRole("link", { name: /treinar/i }).first().click();
    await page.waitForURL(/\/workout\/[a-z0-9]+$/);

    await page.goto("/history");

    await expect(page.getByText(/nenhum treino encerrado ainda/i)).toBeVisible();
  });

  test("exige login pra ver o progresso", async ({ page }) => {
    await page.goto("/progress");

    await expect(page.getByText(/entre para ver seu progresso/i)).toBeVisible();
  });

  // Regressao: sem o ramo de erro, a falha de rede caia no estado vazio e a
  // tela dizia "nenhum treino encerrado ainda" pra quem tinha historico —
  // afirmando que os dados sumiram quando so a requisicao falhou.
  test("falha de rede diz que falhou, e nao que voce nunca treinou", async ({
    page,
  }) => {
    await registrar(page);
    await criaPlano(page, "Falha E2E");
    await treinaEEncerra(page, "60");

    await page.route("**/api/progress/summary**", (route) => route.abort());
    await page.goto("/progress");

    await expect(page.getByText(/não consegui carregar/i)).toBeVisible();
    await expect(page.getByText(/nenhum treino encerrado/i)).toBeHidden();

    // E o retry funciona quando a rede volta.
    await page.unroute("**/api/progress/summary**");
    await page.getByRole("button", { name: /tentar de novo/i }).click();

    await expect(page.getByText(/1 treino até agora/i)).toBeVisible();
  });

  test("falha de rede no historico tambem nao mente", async ({ page }) => {
    await registrar(page);
    await criaPlano(page, "Falha Hist E2E");
    await treinaEEncerra(page, "60");

    await page.route("**/api/sessions", (route) => route.abort());
    await page.goto("/history");

    await expect(page.getByText(/não consegui carregar/i)).toBeVisible();
    await expect(page.getByText(/nenhum treino encerrado/i)).toBeHidden();
  });
});
