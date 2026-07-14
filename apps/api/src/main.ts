import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api");

  const webOrigin =
    config.get<string>("WEB_ORIGIN") ?? "http://localhost:3000";
  app.enableCors({ origin: webOrigin, credentials: true });

  const port = Number(config.get<string>("PORT") ?? 3001);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[api] rodando em http://localhost:${port}/api`);
}

void bootstrap();
