import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND } from "./palette";

const landingCss = readFileSync(
  path.resolve(__dirname, "../app/globals.css"),
  "utf8",
).toLowerCase();

const webCss = readFileSync(
  path.resolve(__dirname, "../../web/src/app/globals.css"),
  "utf8",
).toLowerCase();

describe("paleta da marca", () => {
  it("todo hex de BRAND existe no globals.css da landing", () => {
    for (const [nome, hex] of Object.entries(BRAND)) {
      expect(landingCss, `--${nome} (${hex}) sumiu da landing`).toContain(hex);
    }
  });

  it("todo hex de BRAND bate com a paleta do app web", () => {
    for (const [nome, hex] of Object.entries(BRAND)) {
      expect(webCss, `${nome} (${hex}) divergiu do app web`).toContain(hex);
    }
  });
});
