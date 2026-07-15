import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  CreatePlanSchema,
  UpdatePlanSchema,
  type CreatePlanInput,
  type Plan,
  type PlanSummary,
  type UpdatePlanInput,
} from "@workout/shared";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { PlansService } from "./plans.service";

@Controller("plans")
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  // O userId vem sempre do JWT, nunca do path/body: e o que impede um usuario
  // de pedir o plano de outro.
  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<PlanSummary[]> {
    return this.plans.findAll(user.userId);
  }

  @Get(":id")
  findOne(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<Plan> {
    return this.plans.findOne(user.userId, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreatePlanSchema)) body: CreatePlanInput,
  ): Promise<Plan> {
    return this.plans.create(user.userId, body);
  }

  @Put(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdatePlanSchema)) body: UpdatePlanInput,
  ): Promise<Plan> {
    return this.plans.update(user.userId, id, body);
  }

  @Put(":id/activate")
  activate(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<Plan> {
    return this.plans.activate(user.userId, id);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    return this.plans.remove(user.userId, id);
  }
}
