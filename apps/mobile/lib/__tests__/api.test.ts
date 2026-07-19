import MockAdapter from "axios-mock-adapter";
import { api, SessionExpiredError } from "../api";
import { tokenStorage } from "../storage";

jest.mock("../storage", () => ({
  tokenStorage: {
    getToken: jest.fn(),
    setToken: jest.fn(),
    clear: jest.fn(),
  },
  TokenStorageError: class TokenStorageError extends Error {},
}));

const mockedStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;

let apiMock: MockAdapter;

beforeEach(() => {
  apiMock = new MockAdapter(api);
  mockedStorage.getToken.mockResolvedValue("token-valido");
  mockedStorage.clear.mockResolvedValue(undefined);
  mockedStorage.setToken.mockResolvedValue(undefined);
});

afterEach(() => {
  apiMock.restore();
});

describe("interceptor de request", () => {
  it("anexa o token guardado no header Authorization", async () => {
    apiMock.onGet("/api/plans").reply(200, []);

    await api.get("/api/plans");

    expect(apiMock.history.get[0].headers?.Authorization).toBe(
      "Bearer token-valido"
    );
  });

  it("nao manda Authorization quando nao ha token", async () => {
    mockedStorage.getToken.mockResolvedValue(null);
    apiMock.onGet("/api/plans").reply(200, []);

    await api.get("/api/plans");

    expect(apiMock.history.get[0].headers?.Authorization).toBeUndefined();
  });
});

describe("401 — a API nao tem refresh token, entao e terminal", () => {
  it("converte 401 em SessionExpiredError", async () => {
    apiMock.onGet("/api/plans").reply(401);

    await expect(api.get("/api/plans")).rejects.toThrow(SessionExpiredError);
  });

  it("apaga o token para nao reenviar credencial morta", async () => {
    apiMock.onGet("/api/plans").reply(401);

    await expect(api.get("/api/plans")).rejects.toThrow(SessionExpiredError);

    expect(mockedStorage.clear).toHaveBeenCalled();
  });

  it("nao repete a requisicao original", async () => {
    apiMock.onGet("/api/plans").reply(401);

    await expect(api.get("/api/plans")).rejects.toThrow(SessionExpiredError);

    expect(apiMock.history.get).toHaveLength(1);
  });

  it("nao mascara a sessao expirada quando limpar o token falha", async () => {
    mockedStorage.clear.mockRejectedValue(new Error("keychain locked"));
    apiMock.onGet("/api/plans").reply(401);

    await expect(api.get("/api/plans")).rejects.toThrow(SessionExpiredError);
  });
});

describe("erros que nao sao 401", () => {
  it("repassa o erro sem apagar a sessao", async () => {
    apiMock.onGet("/api/plans").reply(500);

    await expect(api.get("/api/plans")).rejects.toThrow();

    expect(mockedStorage.clear).not.toHaveBeenCalled();
  });

  it("nao trata 403 como sessao expirada", async () => {
    apiMock.onGet("/api/groups/abc/leaderboard").reply(403);

    await expect(api.get("/api/groups/abc/leaderboard")).rejects.not.toThrow(
      SessionExpiredError
    );
    expect(mockedStorage.clear).not.toHaveBeenCalled();
  });
});
