import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreatePlanInput,
  Plan,
  PlanSummary,
  UpdatePlanInput,
} from "@workout/shared";
import { toPlan, type PlanRow } from "../common/plan-mappers";
import { PrismaService } from "../prisma/prisma.service";

/** Traz o plano inteiro: dias ordenados, exercicios ordenados, com o Exercise. */
const PLAN_INCLUDE = {
  days: {
    orderBy: { order: "asc" },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: true },
      },
    },
  },
} as const;

/** Monta o `days.create` aninhado, derivando `order` do indice do array. */
function buildDaysCreate(input: CreatePlanInput) {
  return {
    create: input.days.map((day, dayIndex) => ({
      name: day.name,
      focus: day.focus,
      order: dayIndex,
      exercises: {
        create: day.exercises.map((pe, exIndex) => ({
          exerciseId: pe.exerciseId,
          order: exIndex,
          sets: pe.sets,
          repScheme: pe.repScheme,
          restSec: pe.restSec,
          notes: pe.notes,
        })),
      },
    })),
  };
}

/** So o que o assertExercisesExist precisa — serve pro PrismaService e pra tx. */
interface ExerciseCounter {
  exercise: { count: (args: { where: { id: { in: string[] } } }) => Promise<number> };
}

/**
 * Recusa ids de exercicio que nao existem.
 *
 * Sem isto o Postgres rejeita por FK, o Prisma lanca P2003 e o Nest devolve
 * 500 — classificando entrada malformada do cliente como erro de servidor.
 */
async function assertExercisesExist(
  client: ExerciseCounter,
  input: CreatePlanInput,
): Promise<void> {
  const ids = [
    ...new Set(input.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))),
  ];
  const found = await client.exercise.count({ where: { id: { in: ids } } });
  if (found !== ids.length) {
    throw new BadRequestException("O plano referencia um exercício inexistente");
  }
}

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<PlanSummary[]> {
    const rows = await this.prisma.workoutPlan.findMany({
      where: { userId },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      include: { _count: { select: { days: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      source: row.source as PlanSummary["source"],
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      dayCount: row._count.days,
    }));
  }

  async findOne(userId: string, id: string): Promise<Plan> {
    // findFirst (nao findUnique): o userId precisa entrar no where, senao
    // qualquer um le o plano dos outros so tendo o id.
    const row = await this.prisma.workoutPlan.findFirst({
      where: { id, userId },
      include: PLAN_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException("Plano não encontrado");
    }
    return toPlan(row as PlanRow);
  }

  /**
   * `source` com default MANUAL: o AiService chama isto com "AI" pra reusar a
   * mesma persistencia (assertExercisesExist, buildDaysCreate, o mapper) em vez
   * de duplica-la. As chamadas que ja existiam nao mudam.
   */
  async create(
    userId: string,
    input: CreatePlanInput,
    source: PlanSummary["source"] = "MANUAL",
  ): Promise<Plan> {
    await assertExercisesExist(this.prisma, input);
    const row = await this.prisma.workoutPlan.create({
      data: {
        userId,
        name: input.name,
        notes: input.notes,
        source,
        days: buildDaysCreate(input),
      },
      include: PLAN_INCLUDE,
    });
    return toPlan(row as PlanRow);
  }

  async update(
    userId: string,
    id: string,
    input: UpdatePlanInput,
  ): Promise<Plan> {
    return this.prisma.$transaction(async (tx) => {
      const owned = await tx.workoutPlan.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!owned) {
        throw new NotFoundException("Plano não encontrado");
      }
      // Valida antes de apagar: um id ruim aqui abortaria a transacao no meio.
      await assertExercisesExist(tx, input);
      // Substituicao total: apaga os dias (a cascata leva os PlanExercise) e
      // recria. Mais previsivel que fazer diff de arvore aninhada.
      await tx.planDay.deleteMany({ where: { planId: id } });
      const row = await tx.workoutPlan.update({
        where: { id },
        data: {
          name: input.name,
          notes: input.notes,
          days: buildDaysCreate(input),
        },
        include: PLAN_INCLUDE,
      });
      return toPlan(row as PlanRow);
    });
  }

  async activate(userId: string, id: string): Promise<Plan> {
    return this.prisma.$transaction(async (tx) => {
      const owned = await tx.workoutPlan.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!owned) {
        throw new NotFoundException("Plano não encontrado");
      }
      // Precisa ser atomico: sem transacao da pra terminar com zero ou dois
      // planos ativos se algo falhar no meio.
      await tx.workoutPlan.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });
      const row = await tx.workoutPlan.update({
        where: { id },
        data: { isActive: true },
        include: PLAN_INCLUDE,
      });
      return toPlan(row as PlanRow);
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    // deleteMany com where composto: escopo por dono e atomicidade numa query so.
    const res = await this.prisma.workoutPlan.deleteMany({
      where: { id, userId },
    });
    if (res.count === 0) {
      throw new NotFoundException("Plano não encontrado");
    }
  }
}
