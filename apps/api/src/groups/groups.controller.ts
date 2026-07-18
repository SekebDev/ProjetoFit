import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  CreateGroupSchema,
  JoinGroupSchema,
  LeaderboardMetricSchema,
  LeaderboardPeriodSchema,
  TimeZoneSchema,
  type CreateGroupInput,
  type Group,
  type GroupSummary,
  type JoinGroupInput,
  type Leaderboard,
  type LeaderboardMetric,
  type LeaderboardPeriod,
} from "@workout/shared";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UserThrottlerGuard } from "../common/user-throttler.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { GroupsService } from "./groups.service";

/**
 * O padrao do ranking: XP da semana.
 *
 * Semana e nao "geral" de proposito — o acumulado de sempre congela o placar e
 * quem entrou depois nunca alcanca ninguem.
 */
const PERIODO_PADRAO = LeaderboardPeriodSchema.default("week");
const METRICA_PADRAO = LeaderboardMetricSchema.default("xp");

/** 20 tentativas de codigo a cada 10 minutos, por usuario. */
const LIMITE_JOIN = 20;
const JANELA_JOIN_MS = 10 * 60 * 1000;

@Controller("groups")
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateGroupSchema)) body: CreateGroupInput,
  ): Promise<Group> {
    return this.groups.create(user.userId, body);
  }

  /**
   * Entrar num grupo pelo codigo.
   *
   * Unico endpoint do app que aceita uma credencial ADIVINHAVEL. O espaco de
   * 31^8 ja torna a forca bruta impraticavel, mas o limite fecha a porta em vez
   * de contar com a aritmetica: ninguem digita 20 codigos em 10 minutos por
   * engano, e um script que tente enumerar para no vigesimo.
   *
   * Acima do @Get(":id") nao por acaso: sao metodos diferentes e nao colidem
   * hoje, mas manter as rotas fixas antes das parametrizadas evita a proxima
   * que colidir de verdade.
   */
  @Post("join")
  @HttpCode(200)
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: LIMITE_JOIN, ttl: JANELA_JOIN_MS } })
  join(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(JoinGroupSchema)) body: JoinGroupInput,
  ): Promise<GroupSummary> {
    return this.groups.join(user.userId, body);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<GroupSummary[]> {
    return this.groups.findAll(user.userId);
  }

  @Get(":id")
  findOne(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<Group> {
    return this.groups.findOne(user.userId, id);
  }

  /**
   * O ranking do grupo.
   *
   * `tz` obrigatorio como nas rotas de progresso: semana e mes so existem num
   * fuso, e a sequencia tambem.
   */
  @Get(":id/leaderboard")
  leaderboard(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Query("tz", new ZodValidationPipe(TimeZoneSchema)) tz: string,
    @Query("period", new ZodValidationPipe(PERIODO_PADRAO))
    period: LeaderboardPeriod,
    @Query("metric", new ZodValidationPipe(METRICA_PADRAO))
    metric: LeaderboardMetric,
  ): Promise<Leaderboard> {
    return this.groups.leaderboard(user.userId, id, period, metric, tz);
  }

  @Delete(":id/leave")
  @HttpCode(204)
  leave(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    return this.groups.leave(user.userId, id);
  }
}
