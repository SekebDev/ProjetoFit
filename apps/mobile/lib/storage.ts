import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";

/** Falha ao guardar/limpar token e erro real: o chamador precisa saber. */
export class TokenStorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TokenStorageError";
  }
}

/**
 * Guarda o JWT emitido por POST /auth/login e /auth/register.
 *
 * Nao ha refresh token: a API devolve so `{ token, user }`, entao quando esse
 * token expira o caminho e refazer login.
 */
export const tokenStorage = {
  async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      throw new TokenStorageError("Nao foi possivel salvar a sessao.", {
        cause: error,
      });
    }
  },

  /** Leitura falha => tratamos como "sem sessao", que e o fallback seguro. */
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  /** Token que sobrevive ao logout e problema de seguranca, entao propaga. */
  async clear(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      throw new TokenStorageError("Nao foi possivel encerrar a sessao.", {
        cause: error,
      });
    }
  },
};
