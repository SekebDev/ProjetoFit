import { Injectable } from "@nestjs/common";
import type { BodyMetric, CreateMetricInput } from "@workout/shared";
import { PrismaService } from "../prisma/prisma.service";

/** Teto do historico devolvido — sem isto a query cresce sem limite. */
const MAX_METRICS = 500;

interface MetricRow {
  id: string;
  date: Date;
  weightKg: number | null;
  bodyFat: number | null;
  notes: string | null;
}

function toMetric(row: MetricRow): BodyMetric {
  return {
    id: row.id,
    date: row.date.toISOString(),
    weightKg: row.weightKg,
    bodyFat: row.bodyFat,
    notes: row.notes,
  };
}

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateMetricInput): Promise<BodyMetric> {
    const row = await this.prisma.bodyMetric.create({
      data: {
        userId,
        weightKg: input.weightKg,
        bodyFat: input.bodyFat,
        notes: input.notes,
      },
    });
    return toMetric(row);
  }

  /**
   * Historico do usuario, mais recente primeiro.
   *
   * O grafico precisa da ordem crescente, mas quem inverte e a tela: aqui o
   * desc e o que faz o `take` cortar as medidas ANTIGAS quando alguem passa de
   * 500 registros, nao as recentes.
   */
  async findAll(userId: string): Promise<BodyMetric[]> {
    const rows = await this.prisma.bodyMetric.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: MAX_METRICS,
    });
    return rows.map(toMetric);
  }
}
