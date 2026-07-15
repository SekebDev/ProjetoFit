import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ExerciseFilterSchema,
  type Exercise,
  type ExerciseFilter,
} from "@workout/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ExercisesService } from "./exercises.service";

@Controller("exercises")
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  findAll(
    @Query(new ZodValidationPipe(ExerciseFilterSchema)) filter: ExerciseFilter,
  ): Promise<Exercise[]> {
    return this.exercises.findAll(filter);
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string): Promise<Exercise> {
    return this.exercises.findBySlug(slug);
  }
}
