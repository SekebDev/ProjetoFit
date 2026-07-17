import { expect, test } from "@playwright/test";

/**
 * Instalabilidade do PWA (Fase 6a).
 *
 * O service worker so e gerado/registrado no build de producao (desativado em
 * dev pra nao atrapalhar o HMR), entao o offline nao da pra exercitar aqui — ele
 * e validado pelo `next build`. O que da pra garantir em dev, e o que importa pra
 * instalar no celular, e o manifest linkado, valido e com os icones certos.
 */
test.describe("PWA instalavel", () => {
  test("a home linka o manifest e a theme-color", async ({ page }) => {
    await page.goto("/login");

    const manifestHref = await page
      .locator('link[rel="manifest"]')
      .getAttribute("href");
    expect(manifestHref).toContain("/manifest.webmanifest");

    const themeColor = await page
      .locator('meta[name="theme-color"]')
      .getAttribute("content");
    expect(themeColor).toBe("#0e1014");
  });

  test("o manifest tem os campos minimos pra instalar", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBeTruthy();

    const m = await res.json();
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");

    // Instalabilidade exige um icone 192 e um 512, e um maskable pro Android.
    const sizes: string[] = m.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    const purposes: string[] = m.icons.map(
      (i: { purpose?: string }) => i.purpose ?? "",
    );
    expect(purposes.some((p) => p.includes("maskable"))).toBeTruthy();
  });

  test("os icones referenciados existem e sao PNG", async ({ request }) => {
    for (const src of [
      "/icon-192.png",
      "/icon-512.png",
      "/icon-maskable-512.png",
    ]) {
      const res = await request.get(src);
      expect(res.ok(), `${src} deve responder 200`).toBeTruthy();
      expect(res.headers()["content-type"]).toContain("image/png");
    }
  });
});
