import { randomInt } from "node:crypto";

/**
 * Codigo de convite dos grupos.
 *
 * Alfabeto sem os pares que se confundem quando alguem dita o codigo em voz
 * alta ou le de um print: fora 0/O e 1/I/L. Sobram 31 simbolos, e com 8 posicoes
 * dao ~8.5e11 combinacoes — o suficiente pra adivinhar um codigo valido nao ser
 * caminho pratico pra entrar em grupo alheio.
 */
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const TAMANHO = 8;

/**
 * Sorteia um codigo novo.
 *
 * `randomInt` do node:crypto, nunca Math.random: o codigo E a credencial de
 * entrada no grupo, e um gerador previsivel deixaria deduzir os proximos a
 * partir dos que ja circularam. O randomInt tambem e uniforme — modulo cru
 * sobre bytes viesaria as primeiras letras do alfabeto.
 *
 * Nao garante unicidade: quem garante e o @unique da coluna. Cabe ao service
 * tentar de novo quando o Prisma devolver P2002.
 */
export function generateInviteCode(): string {
  let codigo = "";
  for (let i = 0; i < TAMANHO; i += 1) {
    codigo += ALFABETO[randomInt(ALFABETO.length)];
  }
  return codigo;
}

/**
 * Limpa o que o usuario digitou antes de procurar no banco.
 *
 * Quem recebe um codigo por mensagem cola com espaco, hifen ou em minusculo.
 * Sem isto o join responderia "grupo nao encontrado" pra um codigo certo.
 *
 * Nao tenta adivinhar confusao de simbolo (trocar O por 0, por exemplo): como
 * nenhum dos dois lados do par pertence ao alfabeto, um chute desses so
 * transformaria um erro claro em outro mais dificil de explicar.
 */
export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, "");
}
