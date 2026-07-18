import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  GeneratePlanSchema,
  type GeneratePlanInput,
  type Plan,
} from "@workout/shared";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AiService } from "./ai.service";
import { UserThrottlerGuard } from "../common/user-throttler.guard";

/** 5 geracoes por hora. Ver o comentario no @Throttle abaixo. */
const LIMITE = 5;
const JANELA_MS = 60 * 60 * 1000;

@Controller("ai")
// JwtAuthGuard antes do throttle: e ele que popula request.user, que o
// UserThrottlerGuard le pra contar por usuario em vez de por IP.
@UseGuards(JwtAuthGuard, UserThrottlerGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  /**
   * Unico endpoint do app que custa dinheiro por chamada.
   *
   * Por isso o throttle mora so aqui: um loop no cliente (ou um F5 nervoso)
   * vira fatura de verdade, o que nao acontece em nenhuma outra rota. 5/h e
   * folgado pra uso humano — ninguem monta 6 planos numa hora — e apertado o
   * bastante pra que um bug nao acorde caro.
   *
   * A contagem e por usuario (UserThrottlerGuard), nao por IP: senao um proxy
   * ou NAT em producao faria um usuario bloquear todos os outros.
   */
  @Post("plans/generate")
  @Throttle({ default: { limit: LIMITE, ttl: JANELA_MS } })
  generate(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(GeneratePlanSchema)) body: GeneratePlanInput,
  ): Promise<Plan> {
    // O perfil vem do banco pelo userId, nunca do body: aceita-lo do cliente
    // deixaria alguem gerar um plano com dados que nao sao os dele.
    return this.ai.generate(user.userId, body);
  }
}
