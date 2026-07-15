import { useQuery } from "@tanstack/react-query";
import type { Exercise, ExerciseFilter } from "@workout/shared";
import { apiFetch } from "@/lib/api";

export function useExercises(filter: ExerciseFilter) {
  const qs = new URLSearchParams();
  if (filter.muscleGroup) qs.set("muscleGroup", filter.muscleGroup);
  if (filter.equipment) qs.set("equipment", filter.equipment);
  if (filter.search) qs.set("search", filter.search);
  const q = qs.toString();
  return useQuery({
    queryKey: ["exercises", filter],
    queryFn: () => apiFetch<Exercise[]>(q ? `/exercises?${q}` : "/exercises"),
  });
}

export function useExercise(slug: string) {
  return useQuery({
    queryKey: ["exercise", slug],
    queryFn: () => apiFetch<Exercise>(`/exercises/${slug}`),
  });
}
