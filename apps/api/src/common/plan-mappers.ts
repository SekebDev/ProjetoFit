import type { Exercise, Plan, PlanDay } from "@workout/shared";

// Linha do Prisma -> tipo publico. Ficam aqui, e nao dentro de um service, porque
// tanto /plans quanto /sessions devolvem o dia de treino: a sessao precisa da
// prescricao (series, reps, descanso) pra tela de treino ter o que renderizar.

export interface ExerciseRow {
  id: string;
  slug: string;
  name: string;
  muscleGroup: string;
  category: string;
  equipment: string;
  imageUrl: string | null;
  videoUrl: string | null;
  instructions: string | null;
  defaultRestSec: number;
}

export interface PlanDayRow {
  id: string;
  name: string;
  focus: string | null;
  order: number;
  exercises: {
    id: string;
    order: number;
    sets: number;
    repScheme: string;
    restSec: number;
    notes: string | null;
    exercise: ExerciseRow;
  }[];
}

export interface PlanRow {
  id: string;
  name: string;
  source: string;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  days: PlanDayRow[];
}

export function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    muscleGroup: row.muscleGroup as Exercise["muscleGroup"],
    category: row.category as Exercise["category"],
    equipment: row.equipment as Exercise["equipment"],
    imageUrl: row.imageUrl,
    videoUrl: row.videoUrl,
    instructions: row.instructions,
    defaultRestSec: row.defaultRestSec,
  };
}

export function toPlanDay(row: PlanDayRow): PlanDay {
  return {
    id: row.id,
    name: row.name,
    focus: row.focus,
    order: row.order,
    exercises: row.exercises.map((pe) => ({
      id: pe.id,
      order: pe.order,
      sets: pe.sets,
      repScheme: pe.repScheme,
      restSec: pe.restSec,
      notes: pe.notes,
      exercise: toExercise(pe.exercise),
    })),
  };
}

export function toPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    name: row.name,
    source: row.source as Plan["source"],
    notes: row.notes,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    days: row.days.map(toPlanDay),
  };
}
