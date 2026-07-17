import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { GeneratePlanInput, Plan } from "@workout/shared";
import { apiFetch } from "@/lib/api";

export function useGeneratePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GeneratePlanInput) =>
      apiFetch<Plan>("/ai/plans/generate", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (plan) => {
      // O plano novo entra na listagem; semear o cache do detalhe evita um
      // fetch redundante logo apos o redirect pra /plans/[id].
      void qc.invalidateQueries({ queryKey: ["plans"] });
      qc.setQueryData(["plan", plan.id], plan);
    },
  });
}
