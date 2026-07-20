import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { AxiosError, AxiosHeaders } from "axios";
import SignupScreen from "@/app/(auth)/signup";
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

async function fillForm(name: string, email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText("Nome"), name);
  await fireEvent.changeText(screen.getByLabelText("Email"), email);
  await fireEvent.changeText(screen.getByLabelText("Senha"), password);
}

async function submit() {
  await fireEvent.press(screen.getByRole("button"));
}

beforeEach(() => {
  mockedStorage.setToken.mockResolvedValue(undefined);
});

describe("SignupScreen — validacao", () => {
  it("recusa nome vazio sem chamar a API", async () => {
    await render(<SignupScreen />);

    await submit();

    expect(await screen.findByText("Informe seu nome")).toBeTruthy();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it("recusa email mal formado sem chamar a API", async () => {
    await render(<SignupScreen />);
    await fillForm("Vitor", "nao-e-email", "senhaSegura1");

    await submit();

    expect(await screen.findByText("Email invalido")).toBeTruthy();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  // A API exige min(8); barrar aqui evita um 400 confuso vindo do servidor.
  it("recusa senha com 7 caracteres, o limite da API", async () => {
    await render(<SignupScreen />);
    await fillForm("Vitor", "user@test.com", "1234567");

    await submit();

    expect(
      await screen.findByText("A senha precisa de ao menos 8 caracteres")
    ).toBeTruthy();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it("aceita senha com exatamente 8 caracteres", async () => {
    mockedApi.post.mockResolvedValue({ data: { token: "t" } });
    await render(<SignupScreen />);
    await fillForm("Vitor", "user@test.com", "12345678");

    await submit();

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalled();
    });
  });

  // bcrypt trunca em 72 bytes; a API rejeita acima disso.
  it("recusa senha acima de 72 caracteres", async () => {
    await render(<SignupScreen />);
    await fillForm("Vitor", "user@test.com", "a".repeat(73));

    await submit();

    expect(
      await screen.findByText("A senha pode ter no maximo 72 caracteres")
    ).toBeTruthy();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });
});

describe("SignupScreen — cadastro bem sucedido", () => {
  it("registra, guarda o token e navega para os treinos", async () => {
    mockedApi.post.mockResolvedValue({
      data: { token: "token-abc", user: { id: "1" } },
    });
    await render(<SignupScreen />);
    await fillForm("Vitor", "user@test.com", "senhaSegura1");

    await submit();

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith("/api/auth/register", {
        name: "Vitor",
        email: "user@test.com",
        password: "senhaSegura1",
      });
    });
    expect(mockedStorage.setToken).toHaveBeenCalledWith("token-abc");
    expect(global.mockRouter.replace).toHaveBeenCalledWith("/(tabs)");
  });
});

describe("SignupScreen — falhas", () => {
  it("mostra a mensagem da API quando o email ja existe", async () => {
    const error = new AxiosError("conflict");
    error.response = {
      status: 409,
      data: { message: "Email ja cadastrado" },
      statusText: "",
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    mockedApi.post.mockRejectedValue(error);
    await render(<SignupScreen />);
    await fillForm("Vitor", "user@test.com", "senhaSegura1");

    await submit();

    expect(await screen.findByText("Email ja cadastrado")).toBeTruthy();
    expect(global.mockRouter.replace).not.toHaveBeenCalled();
  });

  it("nao navega quando a resposta vem sem token", async () => {
    mockedApi.post.mockResolvedValue({ data: { user: { id: "1" } } });
    await render(<SignupScreen />);
    await fillForm("Vitor", "user@test.com", "senhaSegura1");

    await submit();

    expect(
      await screen.findByText("Resposta de cadastro invalida.")
    ).toBeTruthy();
    expect(mockedStorage.setToken).not.toHaveBeenCalled();
    expect(global.mockRouter.replace).not.toHaveBeenCalled();
  });
});
