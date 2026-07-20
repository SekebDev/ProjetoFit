import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type {
  ActiveSession,
  Deload,
  Exercise,
  GroupSummary,
  Leaderboard,
  NextWorkout,
  PlanSummary,
  ProgressSummary,
  PublicUser,
  Streak,
} from "./types";

/** GET /plans — resumo, sem os dias. */
export function usePlans() {
  return useQuery<PlanSummary[]>({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data } = await api.get("/api/plans");
      return data;
    },
  });
}

/** GET /exercises?search= — biblioteca com filtro opcional. */
export function useExercises(search?: string) {
  const term = search?.trim();
  return useQuery<Exercise[]>({
    queryKey: ["exercises", term],
    queryFn: async () => {
      const { data } = await api.get("/api/exercises", {
        // A API valida `search` com min(1): mandar "" seria 400.
        params: term ? { search: term } : undefined,
      });
      return data;
    },
  });
}

/** GET /groups — os grupos de que o usuario participa. */
export function useGroups() {
  return useQuery<GroupSummary[]>({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data } = await api.get("/api/groups");
      return data;
    },
  });
}

/**
 * GET /groups/:id/leaderboard — o ranking e por grupo, nao global.
 *
 * Fica desabilitado ate haver um grupo escolhido, senao a query dispararia
 * contra `/groups/undefined/leaderboard`.
 */
export function useGroupLeaderboard(groupId: string | undefined) {
  return useQuery<Leaderboard>({
    queryKey: ["groups", groupId, "leaderboard"],
    enabled: Boolean(groupId),
    queryFn: async () => {
      const { data } = await api.get(`/api/groups/${groupId}/leaderboard`);
      return data;
    },
  });
}

/** GET /auth/me — o usuario autenticado. */
export function useProfile() {
  return useQuery<PublicUser>({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await api.get("/api/auth/me");
      return data;
    },
  });
}

/**
 * GET /plans/next-workout — o proximo treino sugerido no painel.
 * Devolve null quando nao ha plano ativo; a UI mostra o vazio.
 */
export function useNextWorkout() {
  return useQuery<NextWorkout | null>({
    queryKey: ["next-workout"],
    queryFn: async () => {
      const { data } = await api.get("/api/plans/next-workout");
      // Sem plano ativo a API pode devolver null OU corpo vazio (""): as duas
      // viram null pra tela mostrar o vazio em vez de renderizar lixo.
      return data || null;
    },
  });
}

/** GET /progress/streak — a sequencia de treinos pro painel. */
export function useStreak() {
  return useQuery<Streak>({
    queryKey: ["streak"],
    queryFn: async () => {
      const { data } = await api.get("/api/progress/streak");
      return data;
    },
  });
}

/** GET /progress/deload — recomendacao de semana leve. */
export function useDeload() {
  return useQuery<Deload>({
    queryKey: ["deload"],
    queryFn: async () => {
      const { data } = await api.get("/api/progress/deload");
      return data;
    },
  });
}

/** GET /progress/summary — volume semanal e recordes pra tela de progresso. */
export function useProgressSummary() {
  return useQuery<ProgressSummary>({
    queryKey: ["progress-summary"],
    queryFn: async () => {
      const { data } = await api.get("/api/progress/summary");
      return data;
    },
  });
}

/**
 * GET /sessions/active — a sessao em aberto, ou null.
 * O painel usa pra oferecer "retomar treino" quando ha um em curso.
 */
export function useActiveSession() {
  return useQuery<ActiveSession | null>({
    queryKey: ["active-session"],
    queryFn: async () => {
      const { data } = await api.get("/api/sessions/active");
      // Sem sessao em aberto: null ou corpo vazio ("") — ambos viram null.
      return data || null;
    },
  });
}
