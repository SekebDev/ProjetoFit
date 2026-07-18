/** Quem nao preencheu o nome aparece assim pros outros membros. */
const ANONIMO = "Anônimo";

/**
 * Como o nome de um usuario aparece pros OUTROS.
 *
 * Mora sozinho e nao dentro do leaderboard porque e regra de privacidade, nao
 * de ranking: vale igual na lista de membros do grupo e em qualquer lugar novo
 * que exponha gente pra gente. Uma definicao so evita a versao que esquece o
 * fallback e deixa vazar um campo vazio — ou pior, o e-mail no lugar dele.
 */
export function displayName(name: string | null): string {
  return isAnonymous(name) ? ANONIMO : (name as string).trim();
}

/** Nome null, vazio ou so com espaco — tudo isso conta como "sem nome". */
export function isAnonymous(name: string | null): boolean {
  return !name?.trim();
}
