import { isAxiosError } from "axios";
import { TokenStorageError } from "./storage";

/**
 * Traduz qualquer erro de autenticacao numa frase que faz sentido na tela.
 * Nunca repassa detalhe interno de rede pro usuario.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof TokenStorageError) {
    return error.message;
  }

  if (isAxiosError(error)) {
    const apiMessage = error.response?.data?.message;
    if (typeof apiMessage === "string" && apiMessage.length > 0) {
      return apiMessage;
    }

    if (error.response?.status === 401) {
      return "Email ou senha incorretos.";
    }

    if (!error.response) {
      return "Sem conexao com o servidor. Tente novamente.";
    }

    return "Nao foi possivel entrar. Tente novamente.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Erro inesperado. Tente novamente.";
}
