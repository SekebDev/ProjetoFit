import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  CreateMetricSchema,
  type BodyMetric,
  type CreateMetricInput,
} from "@workout/shared";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { MetricsService } from "./metrics.service";

@Controller("metrics")
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  // O userId vem do JWT, nunca do body: e o que impede alguem de gravar peso
  // na conta dos outros.
  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<BodyMetric[]> {
    return this.metrics.findAll(user.userId);
  }

  // 201 (padrao do Nest): aqui, ao contrario do POST /sessions, sempre cria.
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateMetricSchema)) body: CreateMetricInput,
  ): Promise<BodyMetric> {
    return this.metrics.create(user.userId, body);
  }
}
