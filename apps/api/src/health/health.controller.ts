import { Controller, Get } from "@nestjs/common";
import type { Health } from "@workout/shared";

@Controller("health")
export class HealthController {
  // Com o prefixo global "api", a rota final é GET /api/health.
  @Get()
  check(): Health {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
