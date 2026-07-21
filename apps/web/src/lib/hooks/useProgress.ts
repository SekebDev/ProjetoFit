import { useQuery } from "@tanstack/react-query";
import type {
  Deload,
  ExerciseProgress,
  ProgressSummary,
  Streak,
} from "@workout/shared";
import { apiFetch } from "@/lib/api";
import { fusoDoNavegador } from "@/lib/timezone";

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
    // Revalida ao voltar pra tela/foco: treinar em outro aparelho tem que
    // refletir no grafico sem F5 (staleTime: 0, no ritmo do resto do progresso).
    staleTime: 0,
  });
}

export function useDeload() {
  const tz = fusoDoNavegador();
  return useQuery({
    queryKey: ["progress-deload", tz],
    queryFn: () =>
      apiFetch<Deload>(`/progress/deload?tz=${encodeURIComponent(tz)}`),
    // Aviso de deload muda com o volume da semana: revalida ao voltar (0), sem F5.
    staleTime: 0,
  });
}

/**
 * A sequencia de dias agendados cumpridos, que o painel usa pra escolher a pose
 * e a fala da Rackie. `staleTime: 0` sobrepondo os 30s globais: quem termina um
 * treino e volta pro painel precisa ver a sequencia subir na hora.
 */
export function useStreak() {
  const tz = fusoDoNavegador();
  return useQuery({
    queryKey: ["progress-streak", tz],
    queryFn: () =>
      apiFetch<Streak>(`/progress/streak?tz=${encodeURIComponent(tz)}`),
    staleTime: 0,
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
