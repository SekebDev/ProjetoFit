export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Texto de input numerico -> numero, ou null quando vazio/invalido.
 *
 * Vazio vira null e nao 0: "nao informei" e diferente de "informei zero".
 * A virgula vira ponto porque o teclado numerico do celular em pt-BR produz
 * "62,5" — e Number("62,5") e NaN, o que faria o valor sumir calado.
 */
export function numOrNull(v: string): number | null {
  const limpo = v.trim().replace(",", ".");
  if (limpo === "") return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}
