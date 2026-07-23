import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "senha-de-teste-123";

/** Email descartavel — o global-teardown apaga tudo com este dominio. */
function throwawayEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@playwright.local`;
}

/** "1:45" -> 105 */
function paraSegundos(texto: string | null): number {
  if (!texto) return 0;
  const [min, sec] = texto.trim().split(":");
  return Number(min) * 60 + Number(sec);
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

  // Nao esperar por /plans/[a-z0-9]+$: "new" tambem casa esse padrao, entao o
  // waitForURL voltaria na hora, ainda na tela de criacao. O heading com o nome
  // do plano so existe depois que o POST voltou — esse e o sinal de verdade.
  await expect(page.getByRole("heading", { name: nome })).toBeVisible();
  return page.url();
}

/** Sai da tela do plano e entra no treino do primeiro dia. */
async function iniciaTreino(page: Page): Promise<void> {
  await page.getByRole("link", { name: /treinar/i }).first().click();
  await page.waitForURL(/\/workout\/[a-z0-9]+$/);
}

async function registraSerie(
  page: Page,
  numero: number,
  kg: string,
  reps: string,
): Promise<void> {
  await page.getByLabel(`Carga da série ${numero} em kg`).fill(kg);
  await page.getByLabel(`Repetições da série ${numero}`).fill(reps);
  // O botao troca de rotulo depois que a serie entra ("Registrar" -> "Atualizar"),
  // que e justamente o que permite corrigir a carga digitada errada.
  await page
    .getByRole("button", {
      name: new RegExp(`^(Registrar|Atualizar) série ${numero}$`),
    })
    .click();
}

test.describe("Treino", () => {
  test("registra serie, descansa e encerra o treino", async ({ page }) => {
    await registrar(page);
    await criaPlano(page, "Treino E2E");
    await iniciaTreino(page);

    // Contador zerado: 3 series prescritas, nenhuma feita.
    await expect(page.getByText("0/3 séries")).toBeVisible();

    await registraSerie(page, 1, "60", "10");

    // Serie registrada: o contador anda e o descanso comeca sozinho.
    await expect(page.getByText("1/3 séries")).toBeVisible();
    await expect(page.getByRole("timer")).toBeVisible();

    await page.getByRole("button", { name: /pular/i }).click();
    await expect(page.getByRole("timer")).toBeHidden();

    await page.getByRole("button", { name: /encerrar treino/i }).click();
    await page.getByRole("button", { name: /^confirmar$/i }).click();

    await expect(
      page.getByRole("heading", { name: /treino concluído/i }),
    ).toBeVisible();
    await expect(page.getByText(/1 série/)).toBeVisible();
  });

  // A promessa da fase: "bater o registro anterior" tem que ser so olhar o campo.
  test("pre-preenche a carga do treino anterior", async ({ page }) => {
    await registrar(page);
    const urlPlano = await criaPlano(page, "Progressao E2E");

    await iniciaTreino(page);
    await registraSerie(page, 1, "62.5", "8");
    await page.getByRole("button", { name: /encerrar treino/i }).click();
    await page.getByRole("button", { name: /^confirmar$/i }).click();
    await expect(
      page.getByRole("heading", { name: /treino concluído/i }),
    ).toBeVisible();

    // Novo treino do mesmo dia: a carga da vez passada ja vem no campo.
    await page.goto(urlPlano);
    await iniciaTreino(page);

    await expect(page.getByText(/última vez: 62\.5 kg × 8/i)).toBeVisible();
    await expect(page.getByLabel("Carga da série 1 em kg")).toHaveValue("62.5");
    await expect(page.getByLabel("Repetições da série 1")).toHaveValue("8");
  });

  // Regressao: com staleTime Infinity no useSession, o cache servia a sessao
  // ENCERRADA ao remontar e esta tela mostrava "Treino concluido" de novo, ate
  // o gcTime (5 min) expirar. So reproduz com navegacao client-side — um
  // page.goto recarrega tudo e zera o QueryClient, escondendo o problema.
  test("voltar pro mesmo dia depois de encerrar comeca um treino novo", async ({
    page,
  }) => {
    await registrar(page);
    await criaPlano(page, "Recomeco E2E");
    await iniciaTreino(page);
    await registraSerie(page, 1, "60", "10");
    await page.getByRole("button", { name: /encerrar treino/i }).click();
    await page.getByRole("button", { name: /^confirmar$/i }).click();
    await expect(
      page.getByRole("heading", { name: /treino concluído/i }),
    ).toBeVisible();

    // Tudo por Link, sem reload: e assim que o cache sobrevive.
    await page.getByRole("link", { name: /voltar aos planos/i }).click();
    await page.getByRole("link", { name: "Recomeco E2E" }).click();
    await iniciaTreino(page);

    await expect(
      page.getByRole("heading", { name: /treino concluído/i }),
    ).toBeHidden();
    await expect(page.getByText("0/3 séries")).toBeVisible();
  });

  test("corrigir a serie nao duplica o registro", async ({ page }) => {
    await registrar(page);
    await criaPlano(page, "Correcao E2E");
    await iniciaTreino(page);

    await registraSerie(page, 1, "60", "10");
    await expect(page.getByText("1/3 séries")).toBeVisible();

    // Digitou errado e corrigiu: continua sendo uma serie so.
    await page.getByRole("button", { name: /pular/i }).click();
    await registraSerie(page, 1, "65", "10");

    await expect(page.getByText("1/3 séries")).toBeVisible();
    await expect(page.getByLabel("Carga da série 1 em kg")).toHaveValue("65");
  });

  test("o botao de +15s estica o descanso", async ({ page }) => {
    await registrar(page);
    await criaPlano(page, "Timer E2E");
    await iniciaTreino(page);

    await registraSerie(page, 1, "60", "10");
    const timer = page.getByRole("timer");
    await expect(timer).toBeVisible();

    const antes = await timer.textContent();
    await page.getByRole("button", { name: /adicionar 15 segundos/i }).click();
    const depois = await timer.textContent();

    expect(paraSegundos(depois)).toBeGreaterThan(paraSegundos(antes));
  });

  // Modo Dopamina: com o modo ligado no perfil, o descanso mostra o minigame; ao
  // pular o descanso, o timer desmonta e o jogo vai junto (vive dentro dele).
  test("modo dopamina mostra o minigame no descanso e some ao pular", async ({
    page,
  }) => {
    await registrar(page); // cai em /profile

    // Liga o modo e fixa o Flappy pra a asserção do rótulo ser determinística.
    await page
      .getByRole("switch", { name: /ativar modo dopamina/i })
      .click();
    await page.getByRole("button", { name: /^flappy$/i }).click();
    await page.getByRole("button", { name: /salvar perfil/i }).click();
    await expect(page.getByText(/perfil salvo/i)).toBeVisible();

    await criaPlano(page, "Dopamina E2E");
    await iniciaTreino(page);

    await registraSerie(page, 1, "60", "10");

    // Descanso começou: timer e minigame juntos.
    await expect(page.getByRole("timer")).toBeVisible();
    await expect(page.getByTestId("rest-game")).toBeVisible();
    await expect(page.getByText(/modo dopamina · flappy/i)).toBeVisible();

    // Pular encerra o descanso: o timer some e o jogo desmonta junto.
    await page.getByRole("button", { name: /pular/i }).click();
    await expect(page.getByRole("timer")).toBeHidden();
    await expect(page.getByTestId("rest-game")).toBeHidden();
  });

  /**
   * Regressao do bug travado: editar o plano no meio do treino apagava e
   * recriava os PlanDay, a FK da sessao virava null (SetNull) e ela ficava
   * ABERTA sem dia. O painel oferecia "continuar" pra sempre, com o aviso "o
   * plano mudou" e nenhum caminho pra encerrar — nem iniciar e finalizar o
   * treino de novo resolvia, porque isso criava outra sessao e a orfa continuava
   * sendo a unica aberta.
   *
   * Percorre exatamente o relato: treina, percebe que falta exercicio, edita o
   * plano, volta pro painel.
   */
  test("editar o plano no meio do treino nao trava o painel", async ({
    page,
  }) => {
    await registrar(page);
    const urlPlano = await criaPlano(page, "Edicao E2E");
    await iniciaTreino(page);
    await registraSerie(page, 1, "60", "10");
    await expect(page.getByText("1/3 séries")).toBeVisible();

    // Faltou um exercicio: volta no plano e adiciona.
    await page.goto(urlPlano);
    await page.getByRole("button", { name: /^editar$/i }).click();

    // Editando um plano que ja existe, o acordeao do dia vem fechado — o botao
    // de adicionar exercicio mora dentro dele.
    const diaFechado = page.locator('button[aria-expanded="false"]').first();
    if (await diaFechado.count()) await diaFechado.click();

    await page.getByRole("button", { name: /adicionar exercício/i }).click();
    const sheet = page.getByRole("dialog", { name: /escolher exercício/i });
    await sheet.getByPlaceholder(/buscar exercício/i).fill("agachamento");
    await sheet
      .getByRole("button")
      .filter({ hasText: /agachamento/i })
      .first()
      .click();
    await expect(sheet).toBeHidden();
    await page.getByRole("button", { name: /salvar alterações/i }).click();
    await expect(
      page.getByRole("heading", { name: "Edicao E2E" }),
    ).toBeVisible();

    // O painel: sem o aviso travado, e com o treino retomavel.
    await page.goto("/");
    await expect(
      page.getByText(/o plano mudou depois que este treino começou/i),
    ).toBeHidden();
    const retomar = page.getByRole("link", { name: /retomar treino/i });
    await expect(retomar).toBeVisible();

    // E retomar leva de volta ao treino, com a serie registrada preservada e a
    // prescricao ja atualizada — o motivo pelo qual a pessoa foi editar.
    await retomar.click();
    await page.waitForURL(/\/workout\/[a-z0-9]+$/);
    await expect(page.getByText(/^1\/\d+ séries$/)).toBeVisible();

    // A serie de 60kg sobreviveu a edicao. O exercicio original tem order 0,
    // entao e o primeiro campo na tela; o adicionado entra depois dele.
    await expect(
      page.getByLabel("Carga da série 1 em kg").first(),
    ).toHaveValue("60");
    // ...e o exercicio recem-adicionado ja aparece na prescricao.
    await expect(page.getByText(/agachamento/i)).toBeVisible();
  });

  test("exige login pra treinar", async ({ page }) => {
    await page.goto("/workout/qualquer-id");

    await expect(page.getByText(/entre para treinar/i)).toBeVisible();
  });
});
