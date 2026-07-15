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
