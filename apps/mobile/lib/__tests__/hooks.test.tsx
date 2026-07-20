import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MockAdapter from "axios-mock-adapter";
import type { ReactNode } from "react";
import { api } from "../api";
import {
  useActiveSession,
  useDeload,
  useExercises,
  useGroupLeaderboard,
  useGroups,
  useNextWorkout,
  usePlans,
  useProfile,
  useProgressSummary,
  useStreak,
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

describe("useNextWorkout", () => {
  it("bate em GET /api/plans/next-workout", async () => {
    apiMock
      .onGet("/api/plans/next-workout")
      .reply(200, { planId: "p1", name: "Push", isToday: true });

    const { result } = await renderHook(() => useNextWorkout(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiMock.history.get[0].url).toBe("/api/plans/next-workout");
  });

  it("vira null quando nao ha plano ativo", async () => {
    // Sem plano a API responde 200 com corpo vazio; o hook normaliza pra null
    // pra tela mostrar o vazio em vez de quebrar.
    apiMock.onGet("/api/plans/next-workout").reply(200, "");

    const { result } = await renderHook(() => useNextWorkout(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});

describe("useStreak", () => {
  it("bate em GET /api/progress/streak", async () => {
    apiMock
      .onGet("/api/progress/streak")
      .reply(200, { current: 3, best: 5, state: "active" });

    const { result } = await renderHook(() => useStreak(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.current).toBe(3);
  });
});

describe("useDeload", () => {
  it("bate em GET /api/progress/deload", async () => {
    apiMock
      .onGet("/api/progress/deload")
      .reply(200, { recommend: false, reason: null });

    const { result } = await renderHook(() => useDeload(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.recommend).toBe(false);
  });
});

describe("useProgressSummary", () => {
  it("bate em GET /api/progress/summary", async () => {
    apiMock
      .onGet("/api/progress/summary")
      .reply(200, { weeklyVolume: [], records: [], totalSessions: 0 });

    const { result } = await renderHook(() => useProgressSummary(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalSessions).toBe(0);
  });
});

describe("useActiveSession", () => {
  it("vira null quando nao ha sessao em aberto", async () => {
    apiMock.onGet("/api/sessions/active").reply(200, "");

    const { result } = await renderHook(() => useActiveSession(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
