import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  TimeZoneSchema,
  type ExerciseProgress,
  type ProgressSummary,
} from "@workout/shared";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ProgressService } from "./progress.service";

@Controller("progress")
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  /**
   * O `tz` vem do cliente porque so ele sabe o fuso do usuario — sem ele as
   * semanas do grafico sairiam fatiadas no fuso do servidor.
   */
  @Get("summary")
  summary(
    @CurrentUser() user: AuthUser,
    @Query("tz", new ZodValidationPipe(TimeZoneSchema)) tz: string,
  ): Promise<ProgressSummary> {
    return this.progress.summary(user.userId, tz);
  }

  // O userId vem do JWT: o :id aqui e do exercicio (que e publico), mas as
  // series so podem ser as do dono do token.
  @Get("exercise/:id")
  byExercise(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<ExerciseProgress> {
    return this.progress.byExercise(user.userId, id);
  }
}
