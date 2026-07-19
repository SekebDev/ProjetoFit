import * as SecureStore from "expo-secure-store";
import { tokenStorage, TokenStorageError } from "../storage";

const mockedStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe("tokenStorage", () => {
  describe("setToken", () => {
    it("grava o token no SecureStore", async () => {
      mockedStore.setItemAsync.mockResolvedValue(undefined);

      await tokenStorage.setToken("abc123");

      expect(mockedStore.setItemAsync).toHaveBeenCalledWith(
        "auth_token",
        "abc123"
      );
    });

    it("lanca TokenStorageError quando a gravacao falha", async () => {
      mockedStore.setItemAsync.mockRejectedValue(new Error("keychain locked"));

      await expect(tokenStorage.setToken("abc123")).rejects.toThrow(
        TokenStorageError
      );
    });
  });

  describe("getToken", () => {
    it("devolve o token guardado", async () => {
      mockedStore.getItemAsync.mockResolvedValue("abc123");

      await expect(tokenStorage.getToken()).resolves.toBe("abc123");
    });

    it("devolve null quando nao ha token", async () => {
      mockedStore.getItemAsync.mockResolvedValue(null);

      await expect(tokenStorage.getToken()).resolves.toBeNull();
    });

    it("devolve null quando a leitura falha, em vez de lancar", async () => {
      mockedStore.getItemAsync.mockRejectedValue(new Error("keychain locked"));

      await expect(tokenStorage.getToken()).resolves.toBeNull();
    });
  });

  describe("clear", () => {
    it("apaga o token", async () => {
      mockedStore.deleteItemAsync.mockResolvedValue(undefined);

      await tokenStorage.clear();

      expect(mockedStore.deleteItemAsync).toHaveBeenCalledWith("auth_token");
    });

    it("lanca quando nao consegue apagar: token orfao e risco de seguranca", async () => {
      mockedStore.deleteItemAsync.mockRejectedValue(
        new Error("keychain locked")
      );

      await expect(tokenStorage.clear()).rejects.toThrow(TokenStorageError);
    });
  });
});
