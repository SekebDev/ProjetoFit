import { z } from "zod";

export const GOALS = ["FAT_LOSS", "HYPERTROPHY", "STRENGTH", "GENERAL"] as const;
export const EXPERIENCES = [
  "BEGINNER",
  "RETURNING",
  "INTERMEDIATE",
  "ADVANCED",
] as const;
export const FOCUS_AREAS = [
  "UPPER",
  "LOWER",
  "PUSH",
  "PULL",
  "CHEST",
  "BACK",
  "SHOULDERS",
  "ARMS",
  "LEGS",
  "CORE",
] as const;
export const EQUIPMENT = [
  "BARBELL",
  "DUMBBELL",
  "MACHINE",
  "CABLE",
  "BODYWEIGHT",
] as const;

/** Entrada de atualização do perfil (PUT /profile). */
export const UpdateProfileSchema = z.object({
  birthYear: z.number().int().min(1900).max(2100).nullable(),
  heightCm: z.number().min(80).max(260).nullable(),
  weightKg: z.number().min(20).max(400).nullable(),
  goal: z.enum(GOALS),
  experience: z.enum(EXPERIENCES),
  daysPerWeek: z.number().int().min(1).max(7),
  sessionMin: z.number().int().min(10).max(240).nullable(),
  focusAreas: z.array(z.enum(FOCUS_AREAS)),
  equipment: z.array(z.enum(EQUIPMENT)),
  injuries: z.string().max(1000).nullable(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/** Perfil retornado pela API. */
export const ProfileSchema = UpdateProfileSchema.extend({
  id: z.string(),
  userId: z.string(),
  updatedAt: z.string(),
});
export type Profile = z.infer<typeof ProfileSchema>;
