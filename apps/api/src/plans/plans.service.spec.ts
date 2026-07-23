import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { CreatePlanInput } from "@workout/shared";
import { PlansService } from "./plans.service";

const exerciseRow = {
  id: "e1",
  slug: "bench",
  name: "Supino",
  muscleGroup: "CHEST",
  category: "COMPOUND",
  equipment: "BARBELL",
  imageUrl: null,
  videoUrl: null,
  instructions: null,
  defaultRestSec: 120,
  createdAt: new Date(),
};

const planRow = {
  id: "pl1",
  userId: "u1",
  name: "Push/Pull",
  source: "MANUAL",
  notes: null,
  isActive: false,
  createdAt: new Date("2026-07-15T00:00:00.000Z"),
  updatedAt: new Date("2026-07-15T00:00:00.000Z"),
  days: [
    {
      id: "d1",
      planId: "pl1",
      name: "Push",
      focus: null,
      order: 0,
      weekday: null,
      exercises: [
        {
          id: "pe1",
          planDayId: "d1",
          exerciseId: "e1",
          order: 0,
          sets: 3,
          repScheme: "8-12",
          restSec: 120,
          notes: null,
          exercise: exerciseRow,
        },
      ],
    },
  ],
};

const input: CreatePlanInput = {
  name: "Push/Pull",
  notes: null,
  days: [
    {
      name: "Push",
      focus: null,
      weekday: null,
      exercises: [
        {
          exerciseId: "e1",
          sets: 3,
          repScheme: "8-12",
          restSec: 120,
          notes: null,
        },
        { exerciseId: "e2", sets: 4, repScheme: "10", restSec: 60, notes: null },
      ],
    },
    {
      name: "Pull",
      focus: null,
      weekday: null,
      exercises: [
        { exerciseId: "e3", sets: 3, repScheme: "8", restSec: 90, notes: null },
      ],
    },
  ],
};

describe("PlansService", () => {
  describe("findAll", () => {
    it("lista apenas os planos do proprio usuario", async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const service = new PlansService({ workoutPlan: { findMany } } as never);

      await service.findAll("u1");

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1" } }),
      );
    });
  });

  describe("findOne", () => {
    it("busca por id E userId juntos, nunca so pelo id", async () => {
      const findFirst = vi.fn().mockResolvedValue(planRow);
      const service = new PlansService({ workoutPlan: { findFirst } } as never);

      await service.findOne("u1", "pl1");

      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "pl1", userId: "u1" } }),
      );
    });

    it("lanca NotFound quando o plano e de outro usuario", async () => {
      // O where com userId nao casa -> Prisma devolve null, e nao vazamos
      // a existencia do recurso com um 403.
      const findFirst = vi.fn().mockResolvedValue(null);
      const service = new PlansService({ workoutPlan: { findFirst } } as never);

      await expect(service.findOne("intruso", "pl1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("serializa createdAt como string ISO", async () => {
      const findFirst = vi.fn().mockResolvedValue(planRow);
      const service = new PlansService({ workoutPlan: { findFirst } } as never);

      const plan = await service.findOne("u1", "pl1");

      expect(plan.createdAt).toBe("2026-07-15T00:00:00.000Z");
    });
  });

  describe("create", () => {
    // O input referencia 3 exercicios distintos: e1, e2, e3.
    const countTodosExistem = () => vi.fn().mockResolvedValue(3);

    it("deriva order do indice do array, ignorando o que o cliente mandaria", async () => {
      const create = vi.fn().mockResolvedValue(planRow);
      const service = new PlansService({
        workoutPlan: { create },
        exercise: { count: countTodosExistem() },
      } as never);

      await service.create("u1", input);

      const data = create.mock.calls[0][0].data;
      expect(data.userId).toBe("u1");
      expect(data.days.create.map((d: { order: number }) => d.order)).toEqual([
        0, 1,
      ]);
      expect(
        data.days.create[0].exercises.create.map(
          (e: { order: number }) => e.order,
        ),
      ).toEqual([0, 1]);
    });

    it("marca a origem como MANUAL", async () => {
      const create = vi.fn().mockResolvedValue(planRow);
      const service = new PlansService({
        workoutPlan: { create },
        exercise: { count: countTodosExistem() },
      } as never);

      await service.create("u1", input);

      expect(create.mock.calls[0][0].data.source).toBe("MANUAL");
    });

    it("checa os ids de exercicio uma vez so, deduplicados", async () => {
      const count = countTodosExistem();
      const service = new PlansService({
        workoutPlan: { create: vi.fn().mockResolvedValue(planRow) },
        exercise: { count },
      } as never);

      await service.create("u1", input);

      expect(count).toHaveBeenCalledTimes(1);
      expect(count).toHaveBeenCalledWith({
        where: { id: { in: ["e1", "e2", "e3"] } },
      });
    });

    it("rejeita exercicio inexistente com BadRequest, sem gravar nada", async () => {
      // Sem esta checagem o Postgres barra por FK e o cliente recebe um 500.
      const create = vi.fn();
      const service = new PlansService({
        workoutPlan: { create },
        exercise: { count: vi.fn().mockResolvedValue(2) },
      } as never);

      await expect(service.create("u1", input)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe("activate", () => {
    it("desativa os outros planos do usuario antes de ativar o escolhido", async () => {
      const findFirst = vi.fn().mockResolvedValue({ id: "pl1" });
      const updateMany = vi.fn().mockResolvedValue({ count: 1 });
      const update = vi.fn().mockResolvedValue({ ...planRow, isActive: true });
      const tx = { workoutPlan: { findFirst, updateMany, update } };
      const service = new PlansService({
        $transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
      } as never);

      const plan = await service.activate("u1", "pl1");

      // desativa so os do proprio usuario
      expect(updateMany).toHaveBeenCalledWith({
        where: { userId: "u1", isActive: true },
        data: { isActive: false },
      });
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pl1" },
          data: { isActive: true },
        }),
      );
      expect(plan.isActive).toBe(true);
    });

    it("nao desativa nada quando o plano e de outro usuario", async () => {
      const findFirst = vi.fn().mockResolvedValue(null);
      const updateMany = vi.fn();
      const update = vi.fn();
      const tx = { workoutPlan: { findFirst, updateMany, update } };
      const service = new PlansService({
        $transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
      } as never);

      await expect(service.activate("intruso", "pl1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(updateMany).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("recusa plano de outro usuario sem apagar os dias", async () => {
      const findFirst = vi.fn().mockResolvedValue(null);
      const deleteMany = vi.fn();
      const tx = {
        workoutPlan: { findFirst, update: vi.fn() },
        planDay: { deleteMany },
      };
      const service = new PlansService({
        $transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
      } as never);

      await expect(
        service.update("intruso", "pl1", input),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(deleteMany).not.toHaveBeenCalled();
    });

    it("valida os exercicios ANTES de apagar os dias", async () => {
      // Se validasse depois, um id ruim abortaria a transacao com os dias ja
      // apagados — o rollback salva, mas o trabalho e jogado fora a toa.
      const deleteMany = vi.fn();
      const tx = {
        workoutPlan: {
          findFirst: vi.fn().mockResolvedValue({ id: "pl1" }),
          update: vi.fn(),
        },
        planDay: { deleteMany },
        exercise: { count: vi.fn().mockResolvedValue(0) },
      };
      const service = new PlansService({
        $transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
      } as never);

      await expect(service.update("u1", "pl1", input)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(deleteMany).not.toHaveBeenCalled();
    });

    /**
     * O bug que estas asercoes travam: editar o plano zerava o planDayId da
     * sessao em andamento (SetNull) sem fechar a sessao. Ela virava uma orfa
     * aberta que o painel oferecia pra sempre e ninguem conseguia encerrar.
     */
    describe("sessoes em andamento", () => {
      /** Os dias novos que o update recria, com os ids que o Prisma gerou. */
      const diasRecriados = [
        { id: "novo-push", name: "Push", order: 0, exercises: [] },
        { id: "novo-pull", name: "Pull", order: 1, exercises: [] },
      ];

      function fakeTx(sessoesDoPush: unknown[]) {
        return {
          workoutPlan: {
            findFirst: vi.fn().mockResolvedValue({ id: "pl1" }),
            update: vi
              .fn()
              .mockResolvedValue({ ...planRow, days: diasRecriados }),
          },
          planDay: {
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
            findMany: vi
              .fn()
              .mockResolvedValue([
                { id: "d1", name: "Push", order: 0, sessions: sessoesDoPush },
              ]),
          },
          exercise: { count: vi.fn().mockResolvedValue(3) },
          workoutSession: { update: vi.fn(), delete: vi.fn() },
        };
      }

      function servicoCom(tx: unknown) {
        return new PlansService({
          $transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
        } as never);
      }

      it("re-aponta a sessao aberta para o dia recriado", async () => {
        // O que faz o treino continuar de onde parou, ja com o exercicio que a
        // pessoa entrou no plano pra adicionar.
        const tx = fakeTx([
          { id: "s1", date: new Date(), _count: { setLogs: 2 } },
        ]);

        await servicoCom(tx).update("u1", "pl1", input);

        expect(tx.workoutSession.update).toHaveBeenCalledWith({
          where: { id: "s1" },
          data: { planDayId: "novo-push" },
        });
        expect(tx.workoutSession.delete).not.toHaveBeenCalled();
      });

      it("le os dias antigos ANTES do deleteMany", async () => {
        // Depois do delete o vinculo some (SetNull) e nao da mais pra saber de
        // que dia cada sessao aberta veio.
        const ordem: string[] = [];
        const tx = fakeTx([]);
        tx.planDay.findMany.mockImplementation(() => {
          ordem.push("findMany");
          return Promise.resolve([
            { id: "d1", name: "Push", order: 0, sessions: [] },
          ]);
        });
        tx.planDay.deleteMany.mockImplementation(() => {
          ordem.push("deleteMany");
          return Promise.resolve({ count: 1 });
        });

        await servicoCom(tx).update("u1", "pl1", input);

        expect(ordem).toEqual(["findMany", "deleteMany"]);
      });

      it("encerra a sessao com series quando o dia sumiu do plano", async () => {
        const inicio = new Date(Date.now() - 60_000);
        const tx = fakeTx([]);
        // Nenhum dia novo casa com "Vazio" nem com o order 9.
        tx.planDay.findMany.mockResolvedValue([
          {
            id: "d9",
            name: "Vazio",
            order: 9,
            sessions: [{ id: "s1", date: inicio, _count: { setLogs: 3 } }],
          },
        ]);

        await servicoCom(tx).update("u1", "pl1", input);

        const data = tx.workoutSession.update.mock.calls[0][0].data;
        expect(data.finishedAt).toBeInstanceOf(Date);
        // ~60s de treino: o dado do usuario vai pro historico, nao some.
        expect(data.durationSec).toBeGreaterThanOrEqual(59);
        expect(tx.workoutSession.delete).not.toHaveBeenCalled();
      });

      it("apaga a sessao vazia quando o dia sumiu, sem sujar o historico", async () => {
        const tx = fakeTx([]);
        tx.planDay.findMany.mockResolvedValue([
          {
            id: "d9",
            name: "Vazio",
            order: 9,
            sessions: [{ id: "s1", date: new Date(), _count: { setLogs: 0 } }],
          },
        ]);

        await servicoCom(tx).update("u1", "pl1", input);

        expect(tx.workoutSession.delete).toHaveBeenCalledWith({
          where: { id: "s1" },
        });
        expect(tx.workoutSession.update).not.toHaveBeenCalled();
      });

      it("nao mexe em sessao nenhuma quando nao ha treino em andamento", async () => {
        const tx = fakeTx([]);

        await servicoCom(tx).update("u1", "pl1", input);

        expect(tx.workoutSession.update).not.toHaveBeenCalled();
        expect(tx.workoutSession.delete).not.toHaveBeenCalled();
      });

      it("busca so as sessoes ainda abertas", async () => {
        // Sessao encerrada nao pode ser re-apontada nem reaberta: ela ja e
        // historico, e o planDayId null dela e so ausencia de prescricao.
        const tx = fakeTx([]);

        await servicoCom(tx).update("u1", "pl1", input);

        expect(tx.planDay.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { planId: "pl1" },
            select: expect.objectContaining({
              sessions: expect.objectContaining({
                where: { finishedAt: null },
              }),
            }),
          }),
        );
      });
    });
  });

  describe("remove", () => {
    it("exige o userId no delete", async () => {
      const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
      const service = new PlansService({
        workoutPlan: { deleteMany },
      } as never);

      await service.remove("u1", "pl1");

      expect(deleteMany).toHaveBeenCalledWith({
        where: { id: "pl1", userId: "u1" },
      });
    });

    it("lanca NotFound quando nada foi apagado", async () => {
      const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
      const service = new PlansService({
        workoutPlan: { deleteMany },
      } as never);

      await expect(service.remove("intruso", "pl1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
