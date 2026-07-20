import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { AxiosError, AxiosHeaders } from "axios";
import LoginScreen from "@/app/(auth)/login";
import { api } from "@/lib/api";
import { tokenStorage } from "@/lib/storage";

jest.mock("@/lib/api", () => ({
  api: { post: jest.fn() },
  SessionExpiredError: class SessionExpiredError extends Error {},
}));

jest.mock("@/lib/storage", () => ({
  tokenStorage: { setToken: jest.fn() },
  TokenStorageError: class TokenStorageError extends Error {},
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;

// No RNTL v14 render e fireEvent sao assincronos.
async function fillForm(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText("Email"), email);
  await fireEvent.changeText(screen.getByLabelText("Senha"), password);
}

async function submit() {
  await fireEvent.press(screen.getByRole("button"));
}

beforeEach(() => {
  mockedStorage.setToken.mockResolvedValue(undefined);
});

describe("LoginScreen — validacao", () => {
  it("recusa email vazio sem chamar a API", async () => {
    await render(<LoginScreen />);

    await submit();

    expect(await screen.findByText("Informe seu email")).toBeTruthy();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it("recusa email mal formado sem chamar a API", async () => {
    await render(<LoginScreen />);
    await fillForm("nao-e-email", "senha123");

    await submit();

    expect(await screen.findByText("Email invalido")).toBeTruthy();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it("recusa senha vazia sem chamar a API", async () => {
    await render(<LoginScreen />);
    await fillForm("user@test.com", "");

    await submit();

    expect(await screen.findByText("Informe sua senha")).toBeTruthy();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it("aceita senha curta: quem tem conta antiga precisa conseguir entrar", async () => {
    mockedApi.post.mockResolvedValue({ data: { token: "t" } });
    await render(<LoginScreen />);
    await fillForm("user@test.com", "123");

    await submit();

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalled();
    });
  });
});

describe("LoginScreen — login bem sucedido", () => {
  it("guarda o token e navega para o painel", async () => {
    mockedApi.post.mockResolvedValue({
      data: { token: "token-abc", user: { id: "1" } },
    });
    await render(<LoginScreen />);
    await fillForm("user@test.com", "senha123");

    await submit();

    await waitFor(() => {
      expect(mockedStorage.setToken).toHaveBeenCalledWith("token-abc");
    });
    expect(global.mockRouter.replace).toHaveBeenCalledWith("/(tabs)");
  });

  it("manda o email sem espacos das bordas", async () => {
    mockedApi.post.mockResolvedValue({ data: { token: "token-abc" } });
    await render(<LoginScreen />);
    await fillForm("  user@test.com  ", "senha123");

    await submit();

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith("/api/auth/login", {
        email: "user@test.com",
        password: "senha123",
      });
    });
  });
});

describe("LoginScreen — falhas", () => {
  it("mostra a mensagem de credencial invalida e nao navega", async () => {
    const error = new AxiosError("unauthorized");
    error.response = {
      status: 401,
      data: {},
      statusText: "",
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    mockedApi.post.mockRejectedValue(error);
    await render(<LoginScreen />);
    await fillForm("user@test.com", "senha-errada");

    await submit();

    expect(await screen.findByText("Email ou senha incorretos.")).toBeTruthy();
    expect(global.mockRouter.replace).not.toHaveBeenCalled();
  });

  it("nao navega quando a resposta vem sem token", async () => {
    mockedApi.post.mockResolvedValue({ data: { user: { id: "1" } } });
    await render(<LoginScreen />);
    await fillForm("user@test.com", "senha123");

    await submit();

    expect(await screen.findByText("Resposta de login invalida.")).toBeTruthy();
    expect(mockedStorage.setToken).not.toHaveBeenCalled();
    expect(global.mockRouter.replace).not.toHaveBeenCalled();
  });

  it("libera o botao de novo depois de falhar", async () => {
    mockedApi.post.mockRejectedValue(new Error("boom"));
    await render(<LoginScreen />);
    await fillForm("user@test.com", "senha123");

    await submit();

    await waitFor(() => {
      expect(screen.getByText("Entrar")).toBeTruthy();
    });
  });
});
