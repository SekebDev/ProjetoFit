import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MockAdapter from "axios-mock-adapter";
import type { ReactNode } from "react";
import { api } from "../api";
import {
  useExercises,
  useGroupLeaderboard,
  useGroups,
  usePlans,
  useProfile,
} from "../hooks";

jest.mock("../storage", () => ({
  tokenStorage: {
    getToken: jest.fn().mockResolvedValue("token"),
    setToken: jest.fn(),
    clear: jest.fn(),
  },
  TokenStorageError: class TokenStorageError extends Error {},
}));

let apiMock: MockAdapter;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  apiMock = new MockAdapter(api);
});

afterEach(() => {
  apiMock.restore();
});

describe("usePlans", () => {
  it("bate em GET /api/plans", async () => {
    apiMock.onGet("/api/plans").reply(200, [{ id: "p1", name: "Push" }]);

    const { result } = await renderHook(() => usePlans(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "p1", name: "Push" }]);
  });
});

describe("useExercises", () => {
  it("bate em GET /api/exercises sem params quando a busca esta vazia", async () => {
    apiMock.onGet("/api/exercises").reply(200, []);

    const { result } = await renderHook(() => useExercises(""), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // A API valida `search` com min(1): mandar "" daria 400.
    expect(apiMock.history.get[0].params).toBeUndefined();
  });

  it("manda search quando ha termo", async () => {
    apiMock.onGet("/api/exercises").reply(200, []);

    const { result } = await renderHook(() => useExercises("  supino  "), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiMock.history.get[0].params).toEqual({ search: "supino" });
  });
});

describe("useProfile", () => {
  it("bate em GET /api/auth/me, nao em /api/users/me", async () => {
    apiMock.onGet("/api/auth/me").reply(200, { id: "u1", email: "a@b.com" });

    const { result } = await renderHook(() => useProfile(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiMock.history.get[0].url).toBe("/api/auth/me");
  });
});

describe("useGroups", () => {
  it("bate em GET /api/groups", async () => {
    apiMock.onGet("/api/groups").reply(200, [{ id: "g1", name: "Treta" }]);

    const { result } = await renderHook(() => useGroups(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe("useGroupLeaderboard", () => {
  it("bate no leaderboard do grupo escolhido", async () => {
    apiMock
      .onGet("/api/groups/g1/leaderboard")
      .reply(200, { period: "week", metric: "xp", entries: [] });

    const { result } = await renderHook(() => useGroupLeaderboard("g1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.metric).toBe("xp");
  });

  it("nao dispara requisicao sem grupo escolhido", async () => {
    const { result } = await renderHook(() => useGroupLeaderboard(undefined), {
      wrapper,
    });

    // Sem isso, a URL viraria /api/groups/undefined/leaderboard.
    expect(result.current.fetchStatus).toBe("idle");
    expect(apiMock.history.get).toHaveLength(0);
  });
});
