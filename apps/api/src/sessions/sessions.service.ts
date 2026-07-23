import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type {
  FinishSessionInput,
  FinishSessionResult,
  LastLoad,
  LogSetInput,
  Session,
  SessionSummary,
  SetLog,
  StartSessionInput,
} from "@workout/shared";
import { toPlanDay, type PlanDayRow } from "../common/plan-mappers";
import { GameService } from "../game/game.service";
import { PrismaService } from "../prisma/prisma.service";

// `satisfies`, nao `as const`: o as const congela o orderBy num array readonly,
// que o Prisma nao aceita — e de quebra faz a inferencia do include cair fora,
// devolvendo o tipo da sessao sem as relacoes.
/**
 * Traz a sessao inteira: a prescricao do dia (o que a tela de treino renderiza)
 * e as series ja registradas, em ordem estavel.
 */
const SESSION_INCLUDE = {
  planDay: {
    include: {
      exercises: { orderBy: { order: "asc" }, include: { exercise: true } },
    },
  },
  setLogs: { orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }] },
} satisfies Prisma.WorkoutSessionInclude;

interface SetLogRow {
  id: string;
  exerciseId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
  createdAt: Date;
}

interface SessionRow {
  id: string;
  planDayId: string | null;
  date: Date;
  finishedAt: Date | null;
  durationSec: number | null;
  notes: string | null;
  planDay: PlanDayRow | null;
  setLogs: SetLogRow[];
}

function toSetLog(row: SetLogRow): SetLog {
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    setNumber: row.setNumber,
    weightKg: row.weightKg,
    reps: row.reps,
    rpe: row.rpe,
    completed: row.completed,
    createdAt: row.createdAt.toISOString(),
  };
}

function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    planDayId: row.planDayId,
    planDay: row.planDay ? toPlanDay(row.planDay) : null,
    date: row.date.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    durationSec: row.durationSec,
    notes: row.notes,
    setLogs: row.setLogs.map(toSetLog),
  };
}

/** So o que o assertExercisePermitido precisa — serve pro PrismaService e pra tx. */
interface ExerciseCounter {
  exercise: {
    count: (args: { where: { id: string } }) => Promise<number>;
  };
}

/**
 * Recusa registrar serie de exercicio que nao pertence ao treino.
 *
 * Sem isto o Postgres rejeita por FK, o Prisma lanca P2003 e o Nest devolve
 * 500 — classificando entrada malformada do cliente como erro de servidor.
 */
async function assertExercisePermitido(
  client: ExerciseCounter,
  planDay: { exercises: { exerciseId: string }[] } | null,
  exerciseId: string,
): Promise<void> {
  if (planDay) {
    const prescrito = planDay.exercises.some((e) => e.exerciseId === exerciseId);
    if (!prescrito) {
      throw new BadRequestException(
        "Este exercício não faz parte do treino de hoje",
      );
    }
    return;
  }
  // Sem dia (o plano foi editado no meio da sessao e a FK virou null): nao da
  // pra conferir contra a prescricao, entao so garante que o exercicio existe.
  const encontrados = await client.exercise.count({ where: { id: exerciseId } });
  if (encontrados === 0) {
    throw new BadRequestException("O exercício não existe");
  }
}

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly game: GameService,
  ) {}

  async start(userId: string, input: StartSessionInput): Promise<Session> {
    return this.prisma.$transaction(async (tx) => {
      // O dono vem do plano, nao do dia: PlanDay nao tem userId proprio.
      const day = await tx.planDay.findFirst({
        where: { id: input.planDayId, plan: { userId } },
        select: { id: true },
      });
      if (!day) {
        throw new NotFoundException("Dia de treino não encontrado");
      }

      // Idempotente: quem fechou a aba no meio do treino volta pra sessao onde
      // parou, em vez de acumular sessoes vazias no historico.
      //
      // O orderBy nao e decoracao: no READ COMMITTED dois POSTs simultaneos nao
      // se enxergam e ambos criam, entao duas sessoes abertas sao possiveis.
      // Sem ordem, qual delas volta e arbitrario — daria pra cair na vazia e
      // perder de vista as series ja registradas. A mais recente vence.
      const aberta = await tx.workoutSession.findFirst({
        where: { userId, planDayId: input.planDayId, finishedAt: null },
        orderBy: { date: "desc" },
        include: SESSION_INCLUDE,
      });
      if (aberta) {
        return toSession(aberta as SessionRow);
      }

      const row = await tx.workoutSession.create({
        data: { userId, planDayId: input.planDayId },
        include: SESSION_INCLUDE,
      });
      return toSession(row as SessionRow);
    });
  }

  async logSet(
    userId: string,
    sessionId: string,
    input: LogSetInput,
  ): Promise<SetLog> {
    return this.prisma.$transaction(async (tx) => {
      // Trava a linha da sessao ate o fim da transacao.
      //
      // So abrir uma transacao nao bastaria: no READ COMMITTED cada statement
      // le o ultimo commit, entao um finish que commitasse entre a checagem do
      // finishedAt e o upsert deixaria a serie cair numa sessao ja fechada.
      // Com a trava, o UPDATE do finish espera a gente terminar (e a serie
      // entra antes do fim), ou ja terminou e a gente le finishedAt preenchido
      // e recusa. Nos dois casos o resultado e coerente.
      await tx.$queryRaw`SELECT id FROM "WorkoutSession" WHERE id = ${sessionId} FOR UPDATE`;

      // findFirst (nao findUnique): o userId precisa entrar no where, senao
      // qualquer um grava serie na sessao dos outros so tendo o id.
      const session = await tx.workoutSession.findFirst({
        where: { id: sessionId, userId },
        select: {
          id: true,
          finishedAt: true,
          planDay: { select: { exercises: { select: { exerciseId: true } } } },
        },
      });
      if (!session) {
        throw new NotFoundException("Sessão não encontrada");
      }
      if (session.finishedAt) {
        throw new BadRequestException("Esta sessão já foi encerrada");
      }

      await assertExercisePermitido(tx, session.planDay, input.exerciseId);

      // Upsert pela chave composta: um retry de rede (ou corrigir a carga que
      // digitou errado) atualiza a serie em vez de criar uma duplicada.
      const row = await tx.setLog.upsert({
        where: {
          sessionId_exerciseId_setNumber: {
            sessionId,
            exerciseId: input.exerciseId,
            setNumber: input.setNumber,
          },
        },
        create: {
          sessionId,
          exerciseId: input.exerciseId,
          setNumber: input.setNumber,
          weightKg: input.weightKg,
          reps: input.reps,
          rpe: input.rpe,
          completed: input.completed,
        },
        update: {
          weightKg: input.weightKg,
          reps: input.reps,
          rpe: input.rpe,
          completed: input.completed,
        },
      });
      return toSetLog(row);
    });
  }

  async finish(
    userId: string,
    sessionId: string,
    input: FinishSessionInput,
  ): Promise<FinishSessionResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const atual = await tx.workoutSession.findFirst({
          where: { id: sessionId, userId },
          select: { id: true, date: true, finishedAt: true, durationSec: true },
        });
        if (!atual) {
          throw new NotFoundException("Sessão não encontrada");
        }

        // Idempotente: se ja fechou, preserva fim e duracao originais — um retry
        // do finish nao pode esticar a duracao do treino. As notas ainda entram.
        const finishedAt = atual.finishedAt ?? new Date();
        const durationSec =
          atual.durationSec ??
          Math.max(
            0,
            Math.round((finishedAt.getTime() - atual.date.getTime()) / 1000),
          );

        // Quem encontrou a sessao ainda aberta e quem de fato a fechou — e o
        // unico que ganha XP. Sem esta guarda, um retry de rede no finish
        // pagaria o mesmo treino de novo.
        const fechouAgora = atual.finishedAt === null;

        const row = await tx.workoutSession.update({
          where: { id: sessionId },
          data: { finishedAt, durationSec, notes: input.notes },
          include: SESSION_INCLUDE,
        });

        // Depois do update, de proposito: a sequencia que multiplica o XP le as
        // sessoes encerradas, e dentro da transacao ela so enxerga o treino de
        // hoje depois que o finishedAt foi gravado.
        const reward = fechouAgora
          ? await this.game.applyForSession(tx, userId, sessionId, input.tz)
          : null;

        // Segundo update de proposito, e nao um campo a mais no primeiro: o XP
        // so existe depois da apuracao, que por sua vez precisa rodar depois de
        // gravar o finishedAt. A ordem e a mesma corrente de sempre — fecha,
        // apura, registra o que pagou.
        //
        // O campo nao entra no Session devolvido: quem le e o leaderboard dos
        // grupos, somando XP por periodo. A UI ja tem o valor no `reward`.
        if (reward) {
          await tx.workoutSession.update({
            where: { id: sessionId },
            data: { xpGained: reward.xpGained },
          });
        }

        return { session: toSession(row as SessionRow), reward };
      },
      // Acima dos 5s padrao: a transacao agora inclui a apuracao de XP, com a
      // janela de PRs e a sequencia. Estourar o tempo aqui desfaria o fim do
      // treino — o dado que mais importa nao pode cair por causa da recompensa.
      //
      // O maxWait sobe junto: de nada adianta tolerar uma transacao longa se a
      // espera POR UMA CONEXAO continua nos 2s padrao. Com varios finish
      // concorrentes, a transacao mais longa segura o pool e as seguintes
      // falhariam antes mesmo de comecar.
      { timeout: 15_000, maxWait: 10_000 },
    );
  }

  /**
   * A sessao em aberto do usuario, se houver — o que permite ao painel oferecer
   * "continuar treino" sem o usuario ter que reencontrar a URL exata do dia.
   *
   * `date desc` pelo mesmo motivo do start: no READ COMMITTED dois POSTs
   * simultaneos podem deixar duas sessoes abertas; a mais recente vence, pra nao
   * cair na vazia e perder de vista as series ja registradas.
   *
   * `planDayId: not null` e defesa em profundidade. Uma sessao aberta sem dia
   * nao tem pra onde retomar: o painel oferece "continuar", o link nao existe, e
   * como fechar so acontece dentro de /workout/[planDayId], ela nunca sai da
   * frente — o painel fica travado nela. O update do plano ja nao produz mais
   * esse estado (plans.service.rebindSessoesAbertas), mas ignorar a orfa aqui
   * garante que nenhum outro caminho consiga travar o painel de novo.
   */
  async activeSession(userId: string): Promise<Session | null> {
    const row = await this.prisma.workoutSession.findFirst({
      where: { userId, finishedAt: null, planDayId: { not: null } },
      orderBy: { date: "desc" },
      include: SESSION_INCLUDE,
    });
    return row ? toSession(row as SessionRow) : null;
  }

  async findAll(userId: string): Promise<SessionSummary[]> {
    const rows = await this.prisma.workoutSession.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      include: {
        planDay: { select: { name: true } },
        _count: { select: { setLogs: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      planDayId: row.planDayId,
      planDayName: row.planDay?.name ?? null,
      date: row.date.toISOString(),
      finishedAt: row.finishedAt?.toISOString() ?? null,
      durationSec: row.durationSec,
      setCount: row._count.setLogs,
    }));
  }

  async lastLoads(userId: string, planDayId: string): Promise<LastLoad[]> {
    const day = await this.prisma.planDay.findFirst({
      where: { id: planDayId, plan: { userId } },
      select: { exercises: { select: { exerciseId: true } } },
    });
    if (!day) {
      throw new NotFoundException("Dia de treino não encontrado");
    }

    const ids = [...new Set(day.exercises.map((e) => e.exerciseId))];
    if (ids.length === 0) {
      return [];
    }

    // So sessoes encerradas: senao a carga que o usuario acabou de registrar
    // viraria a "ultima carga", mudando embaixo dele no meio do treino.
    const where = {
      exerciseId: { in: ids },
      completed: true,
      session: { userId, finishedAt: { not: null } },
    };

    const [recentes, recordes] = await Promise.all([
      this.prisma.setLog.findMany({
        where,
        // DISTINCT ON exige que o orderBy comece pela coluna distinta; o
        // createdAt desc em seguida e o que faz sobrar a serie mais recente de
        // cada exercicio.
        orderBy: [{ exerciseId: "asc" }, { createdAt: "desc" }],
        distinct: ["exerciseId"],
        include: {
          exercise: { select: { id: true, name: true } },
          session: { select: { date: true } },
        },
      }),
      // A melhor serie de sempre, pra decidir PR. Mesma ordenacao lexicografica
      // que o servidor usa ao apurar XP (game/game.service.ts): carga primeiro,
      // repeticoes no desempate.
      //
      // `nulls: "last"` nao e detalhe: no Postgres, DESC poe NULL na frente, e
      // sem isto uma serie de peso corporal (carga null) viraria o "recorde".
      this.prisma.setLog.findMany({
        where,
        orderBy: [
          { exerciseId: "asc" },
          { weightKg: { sort: "desc", nulls: "last" } },
          { reps: { sort: "desc", nulls: "last" } },
        ],
        distinct: ["exerciseId"],
        select: { exerciseId: true, weightKg: true, reps: true },
      }),
    ]);

    const recordePorExercicio = new Map(
      recordes.map((r) => [r.exerciseId, r]),
    );

    return recentes.map((row) => {
      const recorde = recordePorExercicio.get(row.exerciseId);
      return {
        exercise: { id: row.exercise.id, name: row.exercise.name },
        weightKg: row.weightKg,
        reps: row.reps,
        date: row.session.date.toISOString(),
        bestWeightKg: recorde?.weightKg ?? null,
        bestReps: recorde?.reps ?? null,
      };
    });
  }
}
