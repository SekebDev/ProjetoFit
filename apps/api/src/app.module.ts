import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AiModule } from "./ai/ai.module";
import { AuthModule } from "./auth/auth.module";
import { ExercisesModule } from "./exercises/exercises.module";
import { GameModule } from "./game/game.module";
import { HealthModule } from "./health/health.module";
import { MetricsModule } from "./metrics/metrics.module";
import { PlansModule } from "./plans/plans.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfileModule } from "./profile/profile.module";
import { ProgressModule } from "./progress/progress.module";
import { SessionsModule } from "./sessions/sessions.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    ExercisesModule,
    ProfileModule,
    PlansModule,
    SessionsModule,
    ProgressModule,
    GameModule,
    MetricsModule,
    AiModule,
  ],
})
export class AppModule {}
