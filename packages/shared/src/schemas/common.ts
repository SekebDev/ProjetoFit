import { z } from "zod";

/** Resposta do healthcheck GET /api/health. */
export const HealthSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string(),
  uptime: z.number(),
});
export type Health = z.infer<typeof HealthSchema>;
