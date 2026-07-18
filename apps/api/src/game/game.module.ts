import { Module } from "@nestjs/common";
import { GameController } from "./game.controller";
import { GameService } from "./game.service";

@Module({
  controllers: [GameController],
  providers: [GameService],
  // Exportado porque o SessionsService credita XP dentro da transacao do finish.
  exports: [GameService],
})
export class GameModule {}
