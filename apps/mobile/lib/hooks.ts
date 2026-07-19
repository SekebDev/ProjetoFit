import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data } = await api.get("/api/plans");
      return data;
    },
  });
}

export function useExercises(search?: string) {
  return useQuery({
    queryKey: ["exercises", search],
    queryFn: async () => {
      const { data } = await api.get("/api/exercises", {
        params: { search },
      });
      return data;
    },
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data } = await api.get("/api/leaderboard");
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await api.get("/api/users/me");
      return data;
    },
  });
}

export function usePlanDetail(planId: string) {
  return useQuery({
    queryKey: ["plans", planId],
    queryFn: async () => {
      const { data } = await api.get(`/api/plans/${planId}`);
      return data;
    },
  });
}
