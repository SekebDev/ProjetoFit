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
  leanMassKg: number | null;
  waistCm: number | null;
  armCm: number | null;
  chestCm: number | null;
  thighCm: number | null;
  notes: string | null;
}

function toMetric(row: MetricRow): BodyMetric {
  return {
    id: row.id,
    date: row.date.toISOString(),
    weightKg: row.weightKg,
    bodyFat: row.bodyFat,
    leanMassKg: row.leanMassKg,
    waistCm: row.waistCm,
    armCm: row.armCm,
    chestCm: row.chestCm,
    thighCm: row.thighCm,
    notes: row.notes,
  };
}

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateMetricInput): Promise<BodyMetric> {
    // Spread e nao campo a campo (igual profile.service.ts:34): o input ja veio
    // pelo ZodValidationPipe, e o z.object() descarta chave desconhecida — entao
    // nao ha mass assignment a temer. Listar os campos a mao so criaria a chance
    // de adicionar uma medida no schema e esquecer de grava-la aqui.
    const row = await this.prisma.bodyMetric.create({
      data: { userId, ...input },
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
