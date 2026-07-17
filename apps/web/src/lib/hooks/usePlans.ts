import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePlanInput,
  NextWorkout,
  Plan,
  PlanSummary,
} from "@workout/shared";
import { apiFetch } from "@/lib/api";

/** O fuso do navegador — o servidor precisa dele pra saber que dia e "hoje". */
function fusoDoNavegador(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: () => apiFetch<PlanSummary[]>("/plans"),
  });
}

/**
 * O proximo treino sugerido no painel (ou null), a partir do plano ativo e dos
 * dias agendados. O tz entra na chave: quem troca de fuso ve a sugestao
 * refatiada, nao a do fuso antigo servida do cache.
 */
export function useNextWorkout() {
  const tz = fusoDoNavegador();
  return useQuery({
    queryKey: ["next-workout", tz],
    queryFn: () =>
      apiFetch<NextWorkout | null>(
        `/plans/next-workout?tz=${encodeURIComponent(tz)}`,
      ),
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
      void qc.invalidateQueries({ queryKey: ["next-workout"] });
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
      // Mudar os dias/agenda muda o proximo treino do painel.
      void qc.invalidateQueries({ queryKey: ["next-workout"] });
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
      // Outro plano ativo = outro proximo treino no painel.
      void qc.invalidateQueries({ queryKey: ["next-workout"] });
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
