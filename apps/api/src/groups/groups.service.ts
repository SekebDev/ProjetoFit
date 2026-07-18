import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  GROUP_MAX_MEMBERS,
  type CreateGroupInput,
  type Group,
  type GroupMember,
  type GroupRole,
  type GroupSummary,
  type JoinGroupInput,
  type Leaderboard,
  type LeaderboardMetric,
  type LeaderboardPeriod,
} from "@workout/shared";
import { PrismaService } from "../prisma/prisma.service";
import { computeStreak } from "../progress/streak";
import { displayName } from "./display-name";
import { generateInviteCode, normalizeInviteCode } from "./invite-code";
import { rankMembers } from "./leaderboard";

/**
 * Quantas vezes tentar um codigo novo antes de desistir.
 *
 * Com 31^8 combinacoes, colidir uma vez ja e raro; colidir cinco seguidas
 * significa que o gerador quebrou, e ai falhar alto e melhor que insistir.
 */
const TENTATIVAS_CODIGO = 5;

interface MembroRow {
  userId: string;
  role: string;
  joinedAt: Date;
  user: { name: string | null };
}

interface GrupoRow {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  createdAt: Date;
  members: MembroRow[];
}

interface ResumoRow {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
}

/**
 * O papel vem do banco como String livre (o Prisma nao tem enum aqui). Qualquer
 * coisa fora de OWNER vale como MEMBER: na duvida, o MENOS privilegiado.
 */
function toRole(role: string): GroupRole {
  return role === "OWNER" ? "OWNER" : "MEMBER";
}

function toMember(row: MembroRow): GroupMember {
  return {
    userId: row.userId,
    // displayName e o que garante que o e-mail nunca sai daqui: o select nem
    // traz a coluna, e o nome vazio vira "Anônimo" em vez de string vazia.
    name: displayName(row.user.name),
    role: toRole(row.role),
    joinedAt: row.joinedAt.toISOString(),
  };
}

function toSummary(
  row: ResumoRow,
  role: GroupRole,
  memberCount: number,
): GroupSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    memberCount,
    role,
    createdAt: row.createdAt.toISOString(),
  };
}

function toGroup(row: GrupoRow, role: GroupRole): Group {
  return {
    ...toSummary(row, role, row.members.length),
    inviteCode: row.inviteCode,
    members: row.members.map(toMember),
  };
}

/** Colisao do inviteCode — a unica P2002 que vale a pena tentar de novo. */
function ehCodigoDuplicado(erro: unknown): boolean {
  if (!(erro instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (erro.code !== "P2002") return false;
  const alvo = erro.meta?.target;
  return Array.isArray(alvo)
    ? alvo.includes("inviteCode")
    : String(alvo).includes("inviteCode");
}

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Confirma que o usuario pertence ao grupo e devolve o papel dele.
   *
   * Todo acesso a grupo passa por aqui. O 404 (nunca 403) e deliberado e segue o
   * padrao do resto da API: um 403 confirmaria pra quem esta sondando que o
   * grupo existe. Quem nao e membro nao distingue "nao existe" de "nao e seu".
   */
  private async assertMembro(
    client: Prisma.TransactionClient,
    userId: string,
    groupId: string,
  ): Promise<GroupRole> {
    const membro = await client.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { role: true },
    });
    if (!membro) {
      throw new NotFoundException("Grupo não encontrado");
    }
    return toRole(membro.role);
  }

  async create(userId: string, input: CreateGroupInput): Promise<Group> {
    // Tenta de novo so na colisao de codigo. O @unique da coluna e a autoridade:
    // conferir antes com um findUnique teria janela de corrida entre a consulta
    // e o insert.
    for (let tentativa = 0; tentativa < TENTATIVAS_CODIGO; tentativa += 1) {
      try {
        const row = await this.prisma.group.create({
          data: {
            name: input.name,
            description: input.description,
            inviteCode: generateInviteCode(),
            ownerId: userId,
            // Quem cria ja entra como membro: sem isto o dono nao apareceria no
            // proprio leaderboard, e o assertMembro o barraria do proprio grupo.
            members: { create: { userId, role: "OWNER" } },
          },
          include: {
            members: { include: { user: { select: { name: true } } } },
          },
        });
        return toGroup(row, "OWNER");
      } catch (erro) {
        if (!ehCodigoDuplicado(erro)) throw erro;
      }
    }
    throw new InternalServerErrorException(
      "Não consegui gerar um código de convite. Tente de novo.",
    );
  }

  async join(userId: string, input: JoinGroupInput): Promise<GroupSummary> {
    const code = normalizeInviteCode(input.code);
    // Codigo que virou vazio na normalizacao nao chega a bater no banco.
    if (!code) {
      throw new NotFoundException("Código de convite inválido");
    }

    return this.prisma.$transaction(async (tx) => {
      const grupo = await tx.group.findUnique({
        where: { inviteCode: code },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
      });
      if (!grupo) {
        throw new NotFoundException("Grupo não encontrado");
      }

      const jaMembro = await tx.groupMember.findUnique({
        where: { groupId_userId: { groupId: grupo.id, userId } },
        select: { role: true },
      });

      // Idempotente: reenviar o mesmo codigo devolve o grupo em vez de erro.
      // Quem clica duas vezes no link de convite nao merece uma mensagem de
      // falha.
      if (jaMembro) {
        return toSummary(grupo, toRole(jaMembro.role), grupo._count.members);
      }

      // Teto conferido aqui e nao no banco: nao ha constraint que expresse
      // "no maximo N filhos". Duas entradas simultaneas no ultimo lugar podem
      // furar o limite em uma pessoa — aceitavel pra um teto de conveniencia,
      // e o custo de serializar a transacao nao se paga.
      if (grupo._count.members >= GROUP_MAX_MEMBERS) {
        throw new BadRequestException(
          `Este grupo já atingiu o limite de ${GROUP_MAX_MEMBERS} membros`,
        );
      }

      await tx.groupMember.create({
        data: { groupId: grupo.id, userId, role: "MEMBER" },
      });

      return toSummary(grupo, "MEMBER", grupo._count.members + 1);
    });
  }

  /** Os grupos do usuario, mais recentes primeiro. */
  async findAll(userId: string): Promise<GroupSummary[]> {
    const rows = await this.prisma.groupMember.findMany({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            _count: { select: { members: true } },
          },
        },
      },
    });

    return rows.map((row) =>
      toSummary(row.group, toRole(row.role), row.group._count.members),
    );
  }

  async findOne(userId: string, groupId: string): Promise<Group> {
    const papel = await this.assertMembro(this.prisma, userId, groupId);

    // findUniqueOrThrow e seguro aqui: o assertMembro ja provou que o grupo
    // existe e que este usuario pertence a ele.
    const row = await this.prisma.group.findUniqueOrThrow({
      where: { id: groupId },
      include: {
        members: {
          orderBy: { joinedAt: "asc" },
          include: { user: { select: { name: true } } },
        },
      },
    });

    return toGroup(row, papel);
  }

  /**
   * O ranking do grupo numa metrica e periodo.
   *
   * So membros leem — o assertMembro vem primeiro, antes de qualquer numero
   * sair do banco.
   */
  async leaderboard(
    userId: string,
    groupId: string,
    period: LeaderboardPeriod,
    metric: LeaderboardMetric,
    tz: string,
  ): Promise<Leaderboard> {
    await this.assertMembro(this.prisma, userId, groupId);

    const membros = await this.prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true, user: { select: { name: true } } },
    });
    const ids = membros.map((m) => m.userId);

    const valores = await this.valoresDaMetrica(ids, metric, period, tz);

    return {
      // Nao ecoa o que foi pedido: ecoa o que foi HONRADO. A sequencia ignora a
      // janela (so existe "a de agora"), entao devolver period="month" faria a
      // UI escrever "sequencia do mes" — um numero que ninguem calculou.
      period: metric === "streak" ? "all" : period,
      metric,
      entries: rankMembers(
        membros.map((m) => ({
          userId: m.userId,
          name: m.user.name,
          // Membro sem atividade nao some do ranking: fica com 0 e aparece no
          // fim. Escondê-lo tiraria do grupo exatamente a informacao de quem
          // parou de treinar.
          value: valores.get(m.userId) ?? 0,
        })),
      ),
    };
  }

  /** O numero de cada membro na metrica pedida, indexado por userId. */
  private async valoresDaMetrica(
    ids: readonly string[],
    metric: LeaderboardMetric,
    period: LeaderboardPeriod,
    tz: string,
  ): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();

    // A sequencia e sempre "a de agora": nao existe sequencia da semana passada.
    // Por isso ignora o periodo.
    if (metric === "streak") {
      return this.streaksDosMembros(ids, tz);
    }

    const inicio = await this.inicioDoPeriodo(period, tz);

    switch (metric) {
      case "xp":
        return this.xpDosMembros(ids, inicio);
      case "sessions":
        return this.treinosDosMembros(ids, inicio);
      case "volume":
        return this.volumeDosMembros(ids, inicio);
    }
  }

  /**
   * O instante em que o periodo comeca, no fuso do usuario — ou null pra "all".
   *
   * Sai do Postgres e nao do JS pra semana comecar onde o banco diz que comeca
   * (segunda) e pra respeitar o fuso sem reimplementar calendario aqui. O
   * `date_trunc` corta no fuso local e o `AT TIME ZONE` devolve o instante
   * absoluto correspondente, que e o que a coluna `date` guarda.
   */
  private async inicioDoPeriodo(
    period: LeaderboardPeriod,
    tz: string,
  ): Promise<Date | null> {
    if (period === "all") return null;

    const unidade = period === "week" ? "week" : "month";
    const [{ inicio }] = await this.prisma.$queryRaw<{ inicio: Date }[]>`
      SELECT (
        date_trunc(${unidade}, now() AT TIME ZONE ${tz}) AT TIME ZONE ${tz}
      ) AS "inicio"
    `;
    return inicio;
  }

  /**
   * XP no periodo.
   *
   * "all" le o total acumulado do GameProfile, e nao a soma das sessoes: as
   * sessoes anteriores a coluna xpGained valem 0, e somá-las apagaria do
   * ranking o XP que essas pessoas realmente tem.
   */
  private async xpDosMembros(
    ids: readonly string[],
    inicio: Date | null,
  ): Promise<Map<string, number>> {
    if (!inicio) {
      const perfis = await this.prisma.gameProfile.findMany({
        where: { userId: { in: [...ids] } },
        select: { userId: true, xp: true },
      });
      return new Map(perfis.map((p) => [p.userId, p.xp]));
    }

    const linhas = await this.prisma.workoutSession.groupBy({
      by: ["userId"],
      where: {
        userId: { in: [...ids] },
        finishedAt: { not: null },
        date: { gte: inicio },
      },
      _sum: { xpGained: true },
    });
    return new Map(linhas.map((l) => [l.userId, l._sum.xpGained ?? 0]));
  }

  private async treinosDosMembros(
    ids: readonly string[],
    inicio: Date | null,
  ): Promise<Map<string, number>> {
    const linhas = await this.prisma.workoutSession.groupBy({
      by: ["userId"],
      where: {
        userId: { in: [...ids] },
        finishedAt: { not: null },
        ...(inicio ? { date: { gte: inicio } } : {}),
      },
      _count: { _all: true },
    });
    return new Map(linhas.map((l) => [l.userId, l._count._all]));
  }

  /**
   * Σ reps×carga no periodo.
   *
   * Raw porque o Prisma nao agrega o produto de duas colunas — `_sum` soma uma
   * coluna, e volume e multiplicacao antes da soma.
   */
  private async volumeDosMembros(
    ids: readonly string[],
    inicio: Date | null,
  ): Promise<Map<string, number>> {
    const linhas = await this.prisma.$queryRaw<
      { userId: string; total: number }[]
    >`
      SELECT s."userId" AS "userId",
             COALESCE(sum(sl.reps * sl."weightKg"), 0)::float8 AS "total"
      FROM "SetLog" sl
      JOIN "WorkoutSession" s ON s.id = sl."sessionId"
      WHERE s."userId" IN (${Prisma.join([...ids])})
        AND s."finishedAt" IS NOT NULL
        AND sl.completed
        AND (${inicio}::timestamp IS NULL OR s.date >= ${inicio}::timestamp)
      GROUP BY s."userId"
    `;
    return new Map(linhas.map((l) => [l.userId, l.total]));
  }

  /**
   * A sequencia atual de cada membro.
   *
   * Uma query pras datas de TODO mundo e outra pros planos, em vez de chamar o
   * loadStreak por membro: seriam 3 idas ao banco por pessoa, e um grupo de 50
   * viraria 150 consultas numa unica abertura de tela.
   */
  private async streaksDosMembros(
    ids: readonly string[],
    tz: string,
  ): Promise<Map<string, number>> {
    const [dias, [{ today }], planos] = await Promise.all([
      this.prisma.$queryRaw<{ userId: string; day: string }[]>`
        SELECT DISTINCT
          s."userId" AS "userId",
          to_char(
            date_trunc('day', (s.date AT TIME ZONE 'UTC') AT TIME ZONE ${tz}),
            'YYYY-MM-DD'
          ) AS "day"
        FROM "WorkoutSession" s
        WHERE s."userId" IN (${Prisma.join([...ids])})
          AND s."finishedAt" IS NOT NULL
          AND s.date >= now() - make_interval(days => 400)
      `,
      this.prisma.$queryRaw<{ today: string }[]>`
        SELECT to_char(date_trunc('day', now() AT TIME ZONE ${tz}), 'YYYY-MM-DD')
               AS "today"
      `,
      this.prisma.workoutPlan.findMany({
        where: { userId: { in: [...ids] }, isActive: true },
        select: { userId: true, days: { select: { weekday: true } } },
      }),
    ]);

    const diasPorUsuario = new Map<string, string[]>();
    for (const linha of dias) {
      const atuais = diasPorUsuario.get(linha.userId) ?? [];
      atuais.push(linha.day);
      diasPorUsuario.set(linha.userId, atuais);
    }

    const agendaPorUsuario = new Map<string, number[]>();
    for (const plano of planos) {
      agendaPorUsuario.set(plano.userId, [
        ...new Set(
          plano.days
            .map((d) => d.weekday)
            .filter((w): w is number => w !== null),
        ),
      ]);
    }

    return new Map(
      ids.map((id) => [
        id,
        computeStreak({
          today,
          trainedDates: diasPorUsuario.get(id) ?? [],
          scheduleWeekdays: agendaPorUsuario.get(id) ?? [],
        }).current,
      ]),
    );
  }

  /**
   * Sai do grupo.
   *
   * Dono que sai passa a posse pro membro mais antigo; se era o ultimo, o grupo
   * some. Sem isto sobraria grupo orfao, com um ownerId apontando pra quem nao
   * esta mais dentro.
   */
  async leave(userId: string, groupId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const papel = await this.assertMembro(tx, userId, groupId);

      await tx.groupMember.delete({
        where: { groupId_userId: { groupId, userId } },
      });

      if (papel !== "OWNER") return;

      const sucessor = await tx.groupMember.findFirst({
        where: { groupId },
        orderBy: { joinedAt: "asc" },
        select: { id: true, userId: true },
      });

      if (!sucessor) {
        // Ultimo a sair apaga a luz. Sem isto sobraria um grupo sem ninguem
        // dentro, inalcancavel por qualquer rota e eterno no banco.
        await tx.group.delete({ where: { id: groupId } });
        return;
      }

      await tx.groupMember.update({
        where: { id: sucessor.id },
        data: { role: "OWNER" },
      });
      await tx.group.update({
        where: { id: groupId },
        data: { ownerId: sucessor.userId },
      });
    });
  }
}
