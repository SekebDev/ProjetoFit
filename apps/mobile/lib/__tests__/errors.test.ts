import { AxiosError, AxiosHeaders } from "axios";
import { getAuthErrorMessage } from "../errors";
import { TokenStorageError } from "../storage";

function axiosErrorWith(status: number, data?: unknown): AxiosError {
  const error = new AxiosError("request failed");
  error.response = {
    status,
    data,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

describe("getAuthErrorMessage", () => {
  it("prefere a mensagem que a API mandou", () => {
    const error = axiosErrorWith(400, { message: "Conta bloqueada" });

    expect(getAuthErrorMessage(error)).toBe("Conta bloqueada");
  });

  it("traduz 401 sem mensagem para credencial invalida", () => {
    const error = axiosErrorWith(401);

    expect(getAuthErrorMessage(error)).toBe("Email ou senha incorretos.");
  });

  it("avisa sobre conexao quando nao houve resposta", () => {
    const error = new AxiosError("Network Error");

    expect(getAuthErrorMessage(error)).toBe(
      "Sem conexao com o servidor. Tente novamente."
    );
  });

  it("usa a mensagem do TokenStorageError", () => {
    const error = new TokenStorageError("Nao foi possivel salvar a sessao.");

    expect(getAuthErrorMessage(error)).toBe("Nao foi possivel salvar a sessao.");
  });

  it("repassa a mensagem de um Error comum", () => {
    expect(getAuthErrorMessage(new Error("Resposta invalida."))).toBe(
      "Resposta invalida."
    );
  });

  it("tem fallback para valor lancado que nao e Error", () => {
    expect(getAuthErrorMessage("erro solto")).toBe(
      "Erro inesperado. Tente novamente."
    );
  });

  it("nao vaza corpo de erro que nao seja string", () => {
    const error = axiosErrorWith(500, { message: { nested: true } });

    expect(getAuthErrorMessage(error)).toBe(
      "Nao foi possivel entrar. Tente novamente."
    );
  });
});
