import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePlanInput, Plan, PlanSummary } from "@workout/shared";
import { apiFetch } from "@/lib/api";

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: () => apiFetch<PlanSummary[]>("/plans"),
  });
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: ["plan", id],
    queryFn: () => apiFetch<Plan>(`/plans/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlanInput) =>
      apiFetch<Plan>("/plans", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}

export function useUpdatePlan(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlanInput) =>
      apiFetch<Plan>(`/plans/${id}`, {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["plans"] });
      void qc.invalidateQueries({ queryKey: ["plan", id] });
    },
  });
}

export function useActivatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Plan>(`/plans/${id}/activate`, { method: "PUT" }),
    onSuccess: (plan) => {
      // Ativar mexe no isActive de TODOS os planos, nao so no alvo.
      void qc.invalidateQueries({ queryKey: ["plans"] });
      void qc.invalidateQueries({ queryKey: ["plan", plan.id] });
    },
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}
