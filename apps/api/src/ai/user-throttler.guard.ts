import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { AuthUser } from "../auth/current-user.decorator";

/**
 * Throttle por USUARIO, nao por IP.
 *
 * O ThrottlerGuard padrao rastreia por `req.ip`. Isso quebra de dois jeitos
 * neste endpoint:
 *
 * 1. Em producao atras de proxy ou NAT, todos os usuarios compartilham um IP —
 *    um usuario que gera 5 planos bloquearia todo mundo.
 * 2. Em dev, o navegador e os testes saem do mesmo IP, entao o limite se
 *    esgota entre sessoes que deveriam ser independentes.
 *
 * O JwtAuthGuard (aplicado antes deste no controller) ja populou
 * `request.user`, entao da pra chavear pelo userId. Fallback pro IP so pra nao
 * quebrar caso a rota fosse desprotegida um dia — hoje ela nunca e.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as AuthUser | undefined;
    return user?.userId ?? (req.ip as string);
  }
}
