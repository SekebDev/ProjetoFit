import axios, { AxiosError } from "axios";
import { tokenStorage } from "./storage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Erro de sessao expirada: a UI deve mandar o usuario de volta pro login.
 *
 * A API emite um JWT sem refresh token (ver AuthResponse em @workout/shared),
 * entao 401 e terminal: nao ha o que renovar, so refazer login.
 */
export class SessionExpiredError extends Error {
  constructor(message = "Sessao expirada. Faca login novamente.") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

// eslint-disable-next-line import/no-named-as-default-member -- `axios.create` e a forma canonica da lib
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Token invalido/expirado: some com ele para nao reenviar a cada request.
    // Falhar ao limpar nao pode mascarar o sinal de sessao expirada.
    try {
      await tokenStorage.clear();
    } catch {
      // Sem acao util aqui; o erro de sessao segue para o chamador.
    }

    return Promise.reject(new SessionExpiredError());
  }
);
