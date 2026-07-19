import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type {
  Exercise,
  GroupSummary,
  Leaderboard,
  PlanSummary,
  PublicUser,
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
