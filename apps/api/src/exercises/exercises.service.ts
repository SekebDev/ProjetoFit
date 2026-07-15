import { Injectable, NotFoundException } from "@nestjs/common";
import type { Exercise as PrismaExercise } from "@prisma/client";
import type { Exercise, ExerciseFilter } from "@workout/shared";
import { PrismaService } from "../prisma/prisma.service";

function toExercise(row: PrismaExercise): Exercise {
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

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: ExerciseFilter): Promise<Exercise[]> {
    const rows = await this.prisma.exercise.findMany({
      where: {
        muscleGroup: filter.muscleGroup,
        equipment: filter.equipment,
        name: filter.search
          ? { contains: filter.search, mode: "insensitive" }
          : undefined,
      },
      orderBy: { name: "asc" },
    });
    return rows.map(toExercise);
  }

  async findBySlug(slug: string): Promise<Exercise> {
    const row = await this.prisma.exercise.findUnique({ where: { slug } });
    if (!row) {
      throw new NotFoundException("Exercício não encontrado");
    }
    return toExercise(row);
  }
}
