import { Module } from "@nestjs/common";
import { GameModule } from "../game/game.module";
import { SessionsController } from "./sessions.controller";
import { SessionsService } from "./sessions.service";

@Module({
  // Fechar a sessao credita XP e conquistas, na mesma transacao.
  imports: [GameModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
