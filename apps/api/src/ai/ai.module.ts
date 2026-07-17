import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { PlansModule } from "../plans/plans.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { openAiProvider } from "./openai.provider";

@Module({
  imports: [
    // O limite real vem do @Throttle no controller; este forRoot existe porque
    // o ThrottlerGuard precisa de uma config raiz pra resolver o storage. O
    // default fica folgado de proposito — ele nao governa nada hoje, ja que a
    // unica rota deste modulo declara o proprio limite.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    // Pelo PlansService: o plano gerado e persistido pelo mesmo caminho do
    // manual, so mudando o `source`.
    PlansModule,
  ],
  controllers: [AiController],
  providers: [AiService, openAiProvider],
})
export class AiModule {}
