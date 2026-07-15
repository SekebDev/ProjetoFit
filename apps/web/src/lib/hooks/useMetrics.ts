import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BodyMetric, CreateMetricInput } from "@workout/shared";
import { apiFetch } from "@/lib/api";

export function useMetrics() {
  return useQuery({
    queryKey: ["metrics"],
    queryFn: () => apiFetch<BodyMetric[]>("/metrics"),
  });
}

export function useCreateMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMetricInput) =>
      apiFetch<BodyMetric>("/metrics", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["metrics"] });
    },
  });
}
