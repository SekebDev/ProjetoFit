import { useQuery } from "@tanstack/react-query";
import type { ExerciseProgress, ProgressSummary } from "@workout/shared";
import { apiFetch } from "@/lib/api";

/**
 * O fuso do navegador — o servidor nao tem como adivinhar.
 *
 * Sem mandar isto, as semanas do grafico sairiam fatiadas no fuso do servidor e
 * um treino de domingo a noite apareceria na semana seguinte.
 */
function fusoDoNavegador(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function useProgressSummary() {
  const tz = fusoDoNavegador();
  return useQuery({
    // O tz entra na chave: quem troca de fuso (viagem) tem que ver o grafico
    // refatiado, nao o do fuso antigo servido do cache.
    queryKey: ["progress-summary", tz],
    queryFn: () =>
      apiFetch<ProgressSummary>(
        `/progress/summary?tz=${encodeURIComponent(tz)}`,
      ),
  });
}

export function useExerciseProgress(exerciseId: string) {
  return useQuery({
    queryKey: ["progress-exercise", exerciseId],
    queryFn: () =>
      apiFetch<ExerciseProgress>(
        `/progress/exercise/${encodeURIComponent(exerciseId)}`,
      ),
    enabled: Boolean(exerciseId),
  });
}
