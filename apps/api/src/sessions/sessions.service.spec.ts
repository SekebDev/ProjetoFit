import { BadRequestException, NotFoundException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionsService } from "./sessions.service";

const INICIO = new Date("2026-07-15T10:00:00.000Z");
const FIM = new Date("2026-07-15T11:00:00.000Z");

/**
 * Forma enxuta do planDay: o logSet so faz `select` dos exerciseId pra conferir
 * se a serie pertence ao treino.
 */
const planDayRow = {
  id: "d1",
  name: "Push",
  exercises: [{ exerciseId: "e1" }, { exerciseId: "e2" }],
};

/** Forma completa: o que o SESSION_INCLUDE traz pra tela de treino renderizar. */
const planDayCompleto = {
  id: "d1",
  name: "Push",
  focus: null,
  order: 0,
  exercises: [
    {
      id: "pe1",
      order: 0,
      sets: 3,
      repScheme: "8-12",
      restSec: 120,
      notes: null,
      exercise: {
        id: "e1",
        slug: "supino",
        name: "Supino",
        muscleGroup: "CHEST",
        category: "COMPOUND",
        equipment: "BARBELL",
        imageUrl: null,
        videoUrl: null,
        instructions: null,
        defaultRestSec: 120,
      },
    },
  ],
};

const sessionRow = {
  id: "s1",
  userId: "u1",
  planDayId: "d1",
  date: INICIO,
  finishedAt: null as Date | null,
  durationSec: null as number | null,
  notes: null,
  planDay: planDayCompleto,
  setLogs: [],
};

const setLogRow = {
  id: "sl1",
  exerciseId: "e1",
  setNumber: 1,
  weightKg: 60,
  reps: 10,
  rpe: 8,
  completed: true,
  createdAt: INICIO,
};

/** So o que o service toca — o resto do PrismaClient nao importa pro teste. */
function fakePrisma(overrides: Record<string, unknown>) {
  const client = {
    // O logSet trava a linha da sessao antes de ler; aqui basta um no-op.
    $queryRaw: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  return {
    // Por padrao a transacao so entrega o proprio client ao callback.
    $transaction: (fn: (tx: unknown) => unknown) => fn(client),
    ...client,
  } as never;
}

describe("SessionsService", () => {
  describe("start", () => {
    it("recusa planDay de outro usuario com NotFound", async () => {
      // O where casa o dono via plan.userId; sem dono, o Prisma devolve null.
      const findFirst = vi.fn().mockResolvedValue(null);
      const service = new SessionsService(
        fakePrisma({ planDay: { findFirst } }),
      );

      await expect(
        service.start("intruso", { planDayId: "d1" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("checa o dono pelo plano, nao so pelo id do dia", async () => {
      const findFirst = vi.fn().mockResolvedValue(planDayRow);
      const create = vi.fn().mockResolvedValue(sessionRow);
      const service = new SessionsService(
        fakePrisma({
          planDay: { findFirst },
          workoutSession: { findFirst: vi.fn().mockResolvedValue(null), create },
        }),
      );

      await service.start("u1", { planDayId: "d1" });

      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "d1", plan: { userId: "u1" } },
        }),
      );
    });

    it("devolve a sessao aberta em vez de criar outra", async () => {
      const create = vi.fn();
      const service = new SessionsService(
        fakePrisma({
          planDay: { findFirst: vi.fn().mockResolvedValue(planDayRow) },
          workoutSession: {
            findFirst: vi.fn().mockResolvedValue(sessionRow),
            create,
          },
        }),
      );

      const session = await service.start("u1", { planDayId: "d1" });

      expect(session.id).toBe("s1");
      expect(create).not.toHaveBeenCalled();
    });

    it("pega a sessao aberta mais recente, sem depender da ordem do banco", async () => {
      // Duas sessoes abertas sao possiveis (dois POSTs simultaneos no READ
      // COMMITTED nao se enxergam). Sem orderBy, cairiamos numa qualquer —
      // possivelmente a vazia, perdendo de vista as series ja registradas.
      const findFirst = vi.fn().mockResolvedValue(null);
      const service = new SessionsService(
        fakePrisma({
          planDay: { findFirst: vi.fn().mockResolvedValue(planDayRow) },
          workoutSession: {
            findFirst,
            create: vi.fn().mockResolvedValue(sessionRow),
          },
        }),
      );

      await service.start("u1", { planDayId: "d1" });

      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { date: "desc" } }),
      );
    });

    it("procura a sessao aberta por finishedAt null", async () => {
      const findFirst = vi.fn().mockResolvedValue(null);
      const service = new SessionsService(
        fakePrisma({
          planDay: { findFirst: vi.fn().mockResolvedValue(planDayRow) },
          workoutSession: {
            findFirst,
            create: vi.fn().mockResolvedValue(sessionRow),
          },
        }),
      );

      await service.start("u1", { planDayId: "d1" });

      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u1", planDayId: "d1", finishedAt: null },
        }),
      );
    });

    it("devolve a prescricao do dia, senao a tela de treino nao tem o que renderizar", async () => {
      const service = new SessionsService(
        fakePrisma({
          planDay: { findFirst: vi.fn().mockResolvedValue(planDayRow) },
          workoutSession: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(sessionRow),
          },
        }),
      );

      const session = await service.start("u1", { planDayId: "d1" });

      expect(session.planDay?.name).toBe("Push");
      expect(session.planDay?.exercises[0]).toMatchObject({
        sets: 3,
        repScheme: "8-12",
        restSec: 120,
      });
      expect(session.planDay?.exercises[0].exercise.name).toBe("Supino");
    });

    it("cria a sessao com o userId do token, nao do body", async () => {
      const create = vi.fn().mockResolvedValue(sessionRow);
      const service = new SessionsService(
        fakePrisma({
          planDay: { findFirst: vi.fn().mockResolvedValue(planDayRow) },
          workoutSession: { findFirst: vi.fn().mockResolvedValue(null), create },
        }),
      );

      await service.start("u1", { planDayId: "d1" });

      expect(create.mock.calls[0][0].data).toMatchObject({
        userId: "u1",
        planDayId: "d1",
      });
    });
  });

  describe("logSet", () => {
    const input = {
      exerciseId: "e1",
      setNumber: 1,
      weightKg: 60,
      reps: 10,
      rpe: 8,
      completed: true,
    };

    it("recusa sessao de outro usuario com NotFound", async () => {
      const service = new SessionsService(
        fakePrisma({
          workoutSession: { findFirst: vi.fn().mockResolvedValue(null) },
        }),
      );

      await expect(
        service.logSet("intruso", "s1", input),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("trava a linha da sessao ANTES de ler o finishedAt", async () => {
      // Sem a trava, um finish concorrente commitaria entre a checagem e o
      // upsert e a serie cairia numa sessao fechada. Abrir transacao sozinho
      // nao resolve: no READ COMMITTED cada statement le o ultimo commit.
      const chamadas: string[] = [];
      let sqlDaTrava = "";
      const $queryRaw = vi.fn((sql: unknown) => {
        chamadas.push("lock");
        sqlDaTrava = String(sql);
        return Promise.resolve([]);
      });
      const findFirst = vi.fn(() => {
        chamadas.push("read");
        return Promise.resolve({ ...sessionRow, planDay: planDayRow });
      });
      const service = new SessionsService(
        fakePrisma({
          $queryRaw,
          workoutSession: { findFirst },
          setLog: { upsert: vi.fn().mockResolvedValue(setLogRow) },
        }),
      );

      await service.logSet("u1", "s1", input);

      expect(chamadas).toEqual(["lock", "read"]);
      // FOR UPDATE, nao um SELECT qualquer — e o FOR UPDATE que segura a linha.
      expect(sqlDaTrava).toContain("FOR UPDATE");
    });

    it("recusa registrar serie em sessao ja encerrada", async () => {
      const upsert = vi.fn();
      const service = new SessionsService(
        fakePrisma({
          workoutSession: {
            findFirst: vi.fn().mockResolvedValue({
              ...sessionRow,
              finishedAt: FIM,
              planDay: planDayRow,
            }),
          },
          setLog: { upsert },
        }),
      );

      await expect(service.logSet("u1", "s1", input)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(upsert).not.toHaveBeenCalled();
    });

    it("recusa exercicio que nao esta prescrito no dia, com BadRequest e nao 500", async () => {
      // Sem esta checagem o Postgres barraria por FK e o Nest devolveria 500,
      // classificando entrada ruim do cliente como erro de servidor.
      const upsert = vi.fn();
      const service = new SessionsService(
        fakePrisma({
          workoutSession: {
            findFirst: vi
              .fn()
              .mockResolvedValue({ ...sessionRow, planDay: planDayRow }),
          },
          setLog: { upsert },
        }),
      );

      await expect(
        service.logSet("u1", "s1", { ...input, exerciseId: "intruso" }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(upsert).not.toHaveBeenCalled();
    });

    it("faz upsert pela chave composta: reenviar a serie corrige, nao duplica", async () => {
      const upsert = vi.fn().mockResolvedValue(setLogRow);
      const service = new SessionsService(
        fakePrisma({
          workoutSession: {
            findFirst: vi
              .fn()
              .mockResolvedValue({ ...sessionRow, planDay: planDayRow }),
          },
          setLog: { upsert },
        }),
      );

      await service.logSet("u1", "s1", input);

      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sessionId_exerciseId_setNumber: {
              sessionId: "s1",
              exerciseId: "e1",
              setNumber: 1,
            },
          },
        }),
      );
    });

    it("aceita exercicio existente quando o dia sumiu (plano editado no meio)", async () => {
      // planDay null: a FK e SetNull, entao editar o plano desliga a sessao do
      // dia. Sem dia pra conferir, cai no fallback "o exercicio existe?".
      const count = vi.fn().mockResolvedValue(1);
      const upsert = vi.fn().mockResolvedValue(setLogRow);
      const service = new SessionsService(
        fakePrisma({
          workoutSession: {
            findFirst: vi.fn().mockResolvedValue({
              ...sessionRow,
              planDayId: null,
              planDay: null,
            }),
          },
          exercise: { count },
          setLog: { upsert },
        }),
      );

      await service.logSet("u1", "s1", input);

      expect(count).toHaveBeenCalledWith({ where: { id: "e1" } });
      expect(upsert).toHaveBeenCalled();
    });
  });

  describe("finish", () => {
    // O finish le o relogio pra fechar a sessao, entao os testes daqui fixam a
    // hora. Sem restaurar, o relogio congelado vazaria pros testes seguintes.
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("recusa sessao de outro usuario com NotFound", async () => {
      const service = new SessionsService(
        fakePrisma({
          workoutSession: { findFirst: vi.fn().mockResolvedValue(null) },
        }),
      );

      await expect(
        service.finish("intruso", "s1", { notes: null }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("calcula durationSec a partir do inicio da sessao", async () => {
      const update = vi.fn().mockResolvedValue({
        ...sessionRow,
        finishedAt: FIM,
        durationSec: 3600,
      });
      const service = new SessionsService(
        fakePrisma({
          workoutSession: {
            findFirst: vi.fn().mockResolvedValue(sessionRow),
            update,
          },
        }),
      );
      vi.setSystemTime(FIM);

      await service.finish("u1", "s1", { notes: null });

      // 10:00 -> 11:00 = 3600s. O cliente nao manda duracao: ele mentiria.
      expect(update.mock.calls[0][0].data.durationSec).toBe(3600);
    });

    it("nao remarca o fim quando a sessao ja estava encerrada", async () => {
      // Idempotencia: um retry do finish nao pode esticar a duracao do treino.
      const update = vi.fn().mockResolvedValue({
        ...sessionRow,
        finishedAt: FIM,
        durationSec: 3600,
      });
      const service = new SessionsService(
        fakePrisma({
          workoutSession: {
            findFirst: vi.fn().mockResolvedValue({
              ...sessionRow,
              finishedAt: FIM,
              durationSec: 3600,
            }),
            update,
          },
        }),
      );
      vi.setSystemTime(new Date("2026-07-15T12:00:00.000Z"));

      await service.finish("u1", "s1", { notes: "boa" });

      const data = update.mock.calls[0][0].data;
      expect(data.finishedAt).toEqual(FIM);
      expect(data.durationSec).toBe(3600);
      // ...mas as notas do retry ainda entram.
      expect(data.notes).toBe("boa");
    });
  });

  describe("activeSession", () => {
    it("devolve null quando nao ha sessao em aberto", async () => {
      const findFirst = vi.fn().mockResolvedValue(null);
      const service = new SessionsService(
        fakePrisma({ workoutSession: { findFirst } }),
      );

      await expect(service.activeSession("u1")).resolves.toBeNull();
    });

    it("procura a sessao aberta do proprio usuario, a mais recente", async () => {
      const findFirst = vi.fn().mockResolvedValue(null);
      const service = new SessionsService(
        fakePrisma({ workoutSession: { findFirst } }),
      );

      await service.activeSession("u1");

      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u1", finishedAt: null },
          orderBy: { date: "desc" },
        }),
      );
    });

    it("devolve a sessao com a prescricao e as series pra tela retomar", async () => {
      const service = new SessionsService(
        fakePrisma({
          workoutSession: {
            findFirst: vi
              .fn()
              .mockResolvedValue({ ...sessionRow, setLogs: [setLogRow] }),
          },
        }),
      );

      const session = await service.activeSession("u1");

      expect(session?.id).toBe("s1");
      expect(session?.finishedAt).toBeNull();
      expect(session?.planDay?.name).toBe("Push");
      expect(session?.setLogs).toHaveLength(1);
    });
  });

  describe("findAll", () => {
    it("lista apenas as sessoes do proprio usuario, recentes primeiro", async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const service = new SessionsService(
        fakePrisma({ workoutSession: { findMany } }),
      );

      await service.findAll("u1");

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u1" },
          orderBy: { date: "desc" },
        }),
      );
    });
  });

  describe("lastLoads", () => {
    it("recusa planDay de outro usuario com NotFound", async () => {
      const service = new SessionsService(
        fakePrisma({ planDay: { findFirst: vi.fn().mockResolvedValue(null) } }),
      );

      await expect(service.lastLoads("intruso", "d1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("busca so a ultima serie de cada exercicio do dia, do proprio usuario", async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const service = new SessionsService(
        fakePrisma({
          planDay: { findFirst: vi.fn().mockResolvedValue(planDayRow) },
          setLog: { findMany },
        }),
      );

      await service.lastLoads("u1", "d1");

      const args = findMany.mock.calls[0][0];
      expect(args.where.exerciseId).toEqual({ in: ["e1", "e2"] });
      expect(args.where.session.userId).toBe("u1");
      // distinct + orderBy desc = a linha mais recente de cada exercicio.
      expect(args.distinct).toEqual(["exerciseId"]);
      expect(args.orderBy).toEqual([
        { exerciseId: "asc" },
        { createdAt: "desc" },
      ]);
    });

    it("ignora series de sessoes ainda abertas", async () => {
      // Senao a carga que acabei de registrar hoje viraria minha "ultima carga",
      // e o campo mudaria embaixo do usuario no meio do proprio treino.
      const findMany = vi.fn().mockResolvedValue([]);
      const service = new SessionsService(
        fakePrisma({
          planDay: { findFirst: vi.fn().mockResolvedValue(planDayRow) },
          setLog: { findMany },
        }),
      );

      await service.lastLoads("u1", "d1");

      expect(findMany.mock.calls[0][0].where.session.finishedAt).toEqual({
        not: null,
      });
    });
  });
});
