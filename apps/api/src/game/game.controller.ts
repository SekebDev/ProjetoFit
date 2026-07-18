import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { TimeZoneSchema, type Achievement, type Game } from "@workout/shared";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { GameService } from "./game.service";

@Controller("game")
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(private readonly game: GameService) {}

  /** XP e nivel — a barra do painel. */
  @Get()
  get(@CurrentUser() user: AuthUser): Promise<Game> {
    return this.game.get(user.userId);
  }

  /**
   * Catalogo inteiro com o progresso do usuario.
   *
   * Pede `tz` como as rotas de progresso: o progresso de varias conquistas sai
   * da sequencia, que so faz sentido no fuso de quem treina.
   */
  @Get("achievements")
  achievements(
    @CurrentUser() user: AuthUser,
    @Query("tz", new ZodValidationPipe(TimeZoneSchema)) tz: string,
  ): Promise<Achievement[]> {
    return this.game.achievements(user.userId, tz);
  }
}
