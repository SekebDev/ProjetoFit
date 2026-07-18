import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { GroupsController } from "./groups.controller";
import { GroupsService } from "./groups.service";

@Module({
  imports: [
    // O limite real vem do @Throttle no controller; este forRoot existe porque
    // o ThrottlerGuard precisa de uma config raiz pra resolver o storage. Os
    // numeros aqui sao so o teto generico de quem nao declara o proprio.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}
