import { Module } from "@nestjs/common";
import { PlansController } from "./plans.controller";
import { PlansService } from "./plans.service";

@Module({
  controllers: [PlansController],
  providers: [PlansService],
  // Exportado pro AiModule: o plano gerado por IA e persistido pelo mesmo
  // caminho do manual, so mudando o `source`.
  exports: [PlansService],
})
export class PlansModule {}
