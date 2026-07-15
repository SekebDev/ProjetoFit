import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  FinishSessionSchema,
  LogSetSchema,
  PlanDayIdSchema,
  StartSessionSchema,
  type FinishSessionInput,
  type LastLoad,
  type LogSetInput,
  type Session,
  type SessionSummary,
  type SetLog,
  type StartSessionInput,
} from "@workout/shared";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { SessionsService } from "./sessions.service";

@Controller("sessions")
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  // O userId vem sempre do JWT, nunca do path/body: e o que impede um usuario
  // de mexer na sessao de outro.
  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<SessionSummary[]> {
    return this.sessions.findAll(user.userId);
  }

  // Precisa vir antes de qualquer rota com :id, senao o Nest casaria
  // "last-loads" como se fosse um id de sessao.
  @Get("last-loads")
  lastLoads(
    @CurrentUser() user: AuthUser,
    @Query("planDayId", new ZodValidationPipe(PlanDayIdSchema))
    planDayId: string,
  ): Promise<LastLoad[]> {
    return this.sessions.lastLoads(user.userId, planDayId);
  }

  // 200, nao 201: o start e idempotente e costuma devolver a sessao que ja
  // existia. Responder "Created" quando nada foi criado seria mentira.
  @Post()
  @HttpCode(200)
  start(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(StartSessionSchema)) body: StartSessionInput,
  ): Promise<Session> {
    return this.sessions.start(user.userId, body);
  }

  /** Upsert: reenviar a mesma serie corrige a anterior em vez de duplicar. */
  @Post(":id/logs")
  @HttpCode(200)
  logSet(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(LogSetSchema)) body: LogSetInput,
  ): Promise<SetLog> {
    return this.sessions.logSet(user.userId, id, body);
  }

  @Patch(":id/finish")
  finish(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(FinishSessionSchema)) body: FinishSessionInput,
  ): Promise<Session> {
    return this.sessions.finish(user.userId, id, body);
  }
}
