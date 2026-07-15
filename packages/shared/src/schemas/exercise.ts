import { z } from "zod";

export const MUSCLE_GROUPS = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "ARMS",
  "LEGS",
  "CORE",
] as const;
export const EXERCISE_CATEGORIES = ["COMPOUND", "ISOLATION"] as const;
export const EXERCISE_EQUIPMENT = [
  "BARBELL",
  "DUMBBELL",
  "MACHINE",
  "CABLE",
  "BODYWEIGHT",
] as const;

export const ExerciseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  muscleGroup: z.enum(MUSCLE_GROUPS),
  category: z.enum(EXERCISE_CATEGORIES),
  equipment: z.enum(EXERCISE_EQUIPMENT),
  imageUrl: z.string().nullable(),
  videoUrl: z.string().nullable(),
  instructions: z.string().nullable(),
  defaultRestSec: z.number().int(),
});
export type Exercise = z.infer<typeof ExerciseSchema>;

/** Filtros da biblioteca (GET /exercises?muscleGroup=&equipment=&search=). */
export const ExerciseFilterSchema = z.object({
  muscleGroup: z.enum(MUSCLE_GROUPS).optional(),
  equipment: z.enum(EXERCISE_EQUIPMENT).optional(),
  search: z.string().min(1).max(80).optional(),
});
export type ExerciseFilter = z.infer<typeof ExerciseFilterSchema>;
