import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreatePlanInput,
  NextWorkout,
  Plan,
  PlanSummary,
  UpdatePlanInput,
} from "@workout/shared";
import { toPlan, type PlanRow } from "../common/plan-mappers";
import { PrismaService } from "../prisma/prisma.service";
import { pickNextWorkout } from "./next-workout";
import { resolveRebind, type DiaNovo } from "./rebind-sessions";

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
      weekday: day.weekday,
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

/** O dia como ele estava antes da edicao, com as sessoes que ficaram abertas. */
interface DiaComSessoesAbertas {
  id: string;
  name: string;
  order: number;
  sessions: {
    id: string;
    date: Date;
    _count: { setLogs: number };
  }[];
}

/** So o que o rebindSessoesAbertas precisa — serve pro PrismaService e pra tx. */
interface SessionWriter {
  workoutSession: {
    update: (args: {
      where: { id: string };
      data: { planDayId: string } | { finishedAt: Date; durationSec: number };
    }) => Promise<unknown>;
    delete: (args: { where: { id: string } }) => Promise<unknown>;
  };
}

/**
 * Re-aponta para os dias recriados as sessoes que estavam abertas quando o
 * plano foi editado.
 *
 * Sem isto a sessao fica com planDayId null (onDelete: SetNull) e finishedAt
 * null ao mesmo tempo: aberta, sem prescricao e sem nenhum caminho na UI que
 * consiga fecha-la — o painel trava no aviso "o plano mudou" pra sempre.
 *
 * Quando o dia nao sobreviveu a edicao nao ha pra onde re-apontar, e ai o
 * destino depende do que se perde: sessao COM series vai pro historico
 * encerrada (o dado do usuario e preservado), sessao vazia e APAGADA — e nao
 * encerrada. A diferenca importa: a sequencia conta qualquer sessao com
 * finishedAt preenchido, sem olhar se ha serie registrada
 * (progress/streak-query.ts), entao encerrar a vazia daria um dia de sequencia
 * por um treino que nunca aconteceu.
 *
 * De proposito NAO concede XP ao encerrar: o treino nao foi concluido pelo
 * usuario, foi interrompido por uma edicao de plano. Pagar XP aqui daria pra
 * farmar recompensa comecando treinos e editando o plano em seguida.
 *
 * Uma consequencia aceita do re-vinculo: se a edicao REMOVEU um exercicio que
 * ja tinha serie registrada, os SetLog dele continuam na sessao (penduram nela,
 * nao no dia) mas somem da tela, que renderiza a prescricao nova. O contador
 * pode entao mostrar mais series feitas que prescritas. Preferimos isso a
 * apagar registro de treino que a pessoa de fato fez.
 */
async function rebindSessoesAbertas(
  client: SessionWriter,
  antigos: readonly DiaComSessoesAbertas[],
  novos: readonly DiaNovo[],
  agora: Date,
): Promise<void> {
  for (const antigo of antigos) {
    const destino = resolveRebind(antigo, novos);

    for (const sessao of antigo.sessions) {
      if (destino) {
        await client.workoutSession.update({
          where: { id: sessao.id },
          data: { planDayId: destino },
        });
        continue;
      }

      if (sessao._count.setLogs === 0) {
        await client.workoutSession.delete({ where: { id: sessao.id } });
        continue;
      }

      await client.workoutSession.update({
        where: { id: sessao.id },
        data: {
          finishedAt: agora,
          durationSec: Math.max(
            0,
            Math.round((agora.getTime() - sessao.date.getTime()) / 1000),
          ),
        },
      });
    }
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

  /**
   * O proximo treino sugerido para o painel, a partir do plano ATIVO e dos dias
   * agendados por dia da semana. Null quando nao ha plano ativo ou quando nenhum
   * dia tem `weekday` (plano sem agenda). O `tz` vem do cliente porque so ele
   * sabe o fuso — o mesmo motivo dos endpoints de /progress.
   *
   * Duas queries cruas de tempo, no fuso do usuario: o dia da semana de hoje
   * (ISODOW 1=segunda..7=domingo) e os planDay que ele ja encerrou HOJE — este
   * ultimo faz o painel avancar para o proximo treino em vez de reoferecer o que
   * acabou de ser feito. O `AT TIME ZONE 'UTC'` afirma que a coluna sem fuso e
   * UTC antes de converter pro local (mesma dobra usada em progress.service).
   */
  async nextWorkout(userId: string, tz: string): Promise<NextWorkout | null> {
    const plan = await this.prisma.workoutPlan.findFirst({
      where: { userId, isActive: true },
      select: {
        id: true,
        name: true,
        days: {
          orderBy: { order: "asc" },
          select: { id: true, name: true, focus: true, weekday: true },
        },
      },
    });
    if (!plan) return null;

    const [[{ weekday }], finished] = await Promise.all([
      this.prisma.$queryRaw<{ weekday: number }[]>`
        SELECT EXTRACT(ISODOW FROM (now() AT TIME ZONE ${tz}))::int AS "weekday"
      `,
      this.prisma.$queryRaw<{ planDayId: string }[]>`
        SELECT DISTINCT s."planDayId" AS "planDayId"
        FROM "WorkoutSession" s
        WHERE s."userId" = ${userId}
          AND s."finishedAt" IS NOT NULL
          AND s."planDayId" IS NOT NULL
          AND date_trunc('day', (s."finishedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz})
              = date_trunc('day', now() AT TIME ZONE ${tz})
      `,
    ]);

    const escolha = pickNextWorkout(
      plan.days,
      weekday,
      finished.map((f) => f.planDayId),
    );
    if (!escolha) return null;

    return {
      planId: plan.id,
      planName: plan.name,
      planDayId: escolha.day.id,
      name: escolha.day.name,
      focus: escolha.day.focus,
      weekday: escolha.day.weekday,
      isToday: escolha.isToday,
    };
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

      // Fotografa os dias e as sessoes ainda abertas ANTES de apagar: depois do
      // deleteMany o vinculo some (SetNull) e nao ha mais como saber de que dia
      // cada sessao em andamento veio.
      const antigos = await tx.planDay.findMany({
        where: { planId: id },
        select: {
          id: true,
          name: true,
          order: true,
          sessions: {
            where: { finishedAt: null },
            select: { id: true, date: true, _count: { select: { setLogs: true } } },
          },
        },
      });

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

      // Depois de recriar, de proposito: so agora existem os ids novos pra onde
      // apontar as sessoes que ficaram orfas.
      await rebindSessoesAbertas(tx, antigos, row.days, new Date());

      return toPlan(row as PlanRow);
    },
    // Acima dos 5s padrao, pelo mesmo motivo do finish (sessions.service): a
    // transacao deixou de ser "apaga e recria os dias" e passou a incluir uma
    // escrita por sessao em andamento. Sao poucas na pratica (o normal e zero ou
    // uma), mas estourar o tempo aqui desfaria a edicao inteira do plano — e o
    // usuario perderia o trabalho por causa da faxina que ele nem pediu.
    //
    // O maxWait sobe junto: tolerar transacao longa nao adianta se a espera POR
    // UMA CONEXAO continua nos 2s padrao.
    { timeout: 15_000, maxWait: 10_000 },
    );
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
