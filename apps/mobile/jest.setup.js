/* global jest, beforeEach */

// SecureStore fala com Keychain/Keystore nativo: nao existe no Node.
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// As telas so precisam saber que navegaram, nao para onde o router monta.
const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
};

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  Stack: "Stack",
  Tabs: "Tabs",
}));

global.mockRouter = mockRouter;

beforeEach(() => {
  jest.clearAllMocks();
});
