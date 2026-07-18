import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { GroupsService } from "./groups.service";

const CRIADO_EM = new Date("2026-07-18T12:00:00.000Z");

const grupoRow = {
  id: "g1",
  name: "Treta da Academia",
  description: null,
  inviteCode: "K7M2QX9P",
  createdAt: CRIADO_EM,
  members: [
    {
      userId: "u1",
      role: "OWNER",
      joinedAt: CRIADO_EM,
      user: { name: "Ana" },
    },
  ],
};

/** So o que o service toca — o resto do PrismaClient nao importa pro teste. */
function fakePrisma(overrides: Record<string, unknown>) {
  const client = { ...overrides };
  return {
    // Por padrao a transacao so entrega o proprio client ao callback.
    $transaction: (fn: (tx: unknown) => unknown) => fn(client),
    ...client,
  } as never;
}

function makeService(prisma: never) {
  return new GroupsService(prisma);
}

/** A colisao de inviteCode como o Prisma a reporta. */
function colisaoDeCodigo(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint", {
    code: "P2002",
    clientVersion: "6.19.3",
    meta: { target: ["inviteCode"] },
  });
}

describe("GroupsService", () => {
  describe("create", () => {
    it("poe quem criou dentro do grupo como dono", async () => {
      const create = vi.fn().mockResolvedValue(grupoRow);
      const service = makeService(fakePrisma({ group: { create } }));

      const grupo = await service.create("u1", {
        name: "Treta da Academia",
        description: null,
      });

      expect(grupo.role).toBe("OWNER");
      // Sem isto o dono nem apareceria no proprio leaderboard.
      expect(create.mock.calls[0][0].data.members.create).toEqual({
        userId: "u1",
        role: "OWNER",
      });
    });

    it("sorteia outro codigo quando o primeiro ja existe", async () => {
      // O @unique da coluna e a autoridade: conferir antes com um findUnique
      // teria janela de corrida entre a consulta e o insert.
      const create = vi
        .fn()
        .mockRejectedValueOnce(colisaoDeCodigo())
        .mockResolvedValueOnce(grupoRow);
      const service = makeService(fakePrisma({ group: { create } }));

      await service.create("u1", { name: "X", description: null });

      expect(create).toHaveBeenCalledTimes(2);
      const primeiro = create.mock.calls[0][0].data.inviteCode;
      const segundo = create.mock.calls[1][0].data.inviteCode;
      expect(primeiro).not.toBe(segundo);
    });

    it("propaga erro que nao e colisao de codigo, sem tentar de novo", async () => {
      const create = vi.fn().mockRejectedValue(new Error("banco caiu"));
      const service = makeService(fakePrisma({ group: { create } }));

      await expect(
        service.create("u1", { name: "X", description: null }),
      ).rejects.toThrow("banco caiu");
      expect(create).toHaveBeenCalledTimes(1);
    });
  });

  describe("join", () => {
    const grupoAberto = {
      id: "g1",
      name: "Treta",
      description: null,
      createdAt: CRIADO_EM,
      _count: { members: 2 },
    };

    function fakeParaJoin(
      grupo: unknown,
      jaMembro: unknown = null,
      create = vi.fn(),
    ) {
      return fakePrisma({
        group: { findUnique: vi.fn().mockResolvedValue(grupo) },
        groupMember: {
          findUnique: vi.fn().mockResolvedValue(jaMembro),
          create,
        },
      });
    }

    it("normaliza o codigo antes de procurar", async () => {
      const findUnique = vi.fn().mockResolvedValue(grupoAberto);
      const service = makeService(
        fakePrisma({
          group: { findUnique },
          groupMember: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
          },
        }),
      );

      await service.join("u2", { code: " k7m2-qx9p " });

      expect(findUnique.mock.calls[0][0].where.inviteCode).toBe("K7M2QX9P");
    });

    it("entrar de novo devolve o grupo em vez de erro", async () => {
      // Quem clica duas vezes no link de convite nao merece uma falha.
      const create = vi.fn();
      const service = makeService(
        fakeParaJoin(grupoAberto, { role: "MEMBER" }, create),
      );

      const resumo = await service.join("u2", { code: "K7M2QX9P" });

      expect(resumo.role).toBe("MEMBER");
      expect(create).not.toHaveBeenCalled();
    });

    it("recusa quando o grupo esta cheio", async () => {
      const service = makeService(
        fakeParaJoin({ ...grupoAberto, _count: { members: 50 } }),
      );

      await expect(
        service.join("u2", { code: "K7M2QX9P" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("codigo inexistente vira NotFound", async () => {
      const service = makeService(fakeParaJoin(null));

      await expect(
        service.join("u2", { code: "ZZZZZZZZ" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("codigo que normaliza pra vazio nem consulta o banco", async () => {
      const findUnique = vi.fn();
      const service = makeService(fakePrisma({ group: { findUnique } }));

      await expect(service.join("u2", { code: "---" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(findUnique).not.toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("quem nao e membro leva 404, nunca 403", async () => {
      // Um 403 confirmaria pra quem esta sondando que o grupo existe.
      const service = makeService(
        fakePrisma({
          groupMember: { findUnique: vi.fn().mockResolvedValue(null) },
        }),
      );

      await expect(service.findOne("intruso", "g1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("troca nome vazio por Anonimo", async () => {
      const service = makeService(
        fakePrisma({
          groupMember: {
            findUnique: vi.fn().mockResolvedValue({ role: "OWNER" }),
          },
          group: {
            findUniqueOrThrow: vi.fn().mockResolvedValue({
              ...grupoRow,
              members: [
                { ...grupoRow.members[0], userId: "u9", user: { name: "  " } },
              ],
            }),
          },
        }),
      );

      const grupo = await service.findOne("u1", "g1");

      expect(grupo.members[0].name).toBe("Anônimo");
    });
  });

  describe("leave", () => {
    function fakeParaLeave(
      papel: string,
      sucessor: unknown,
      spies: Record<string, ReturnType<typeof vi.fn>> = {},
    ) {
      return fakePrisma({
        groupMember: {
          findUnique: vi.fn().mockResolvedValue({ role: papel }),
          delete: spies.deleteMembro ?? vi.fn(),
          findFirst: vi.fn().mockResolvedValue(sucessor),
          update: spies.updateMembro ?? vi.fn(),
        },
        group: {
          delete: spies.deleteGrupo ?? vi.fn(),
          update: spies.updateGrupo ?? vi.fn(),
        },
      });
    }

    it("membro comum so sai, sem mexer no grupo", async () => {
      const deleteGrupo = vi.fn();
      const updateGrupo = vi.fn();
      const service = makeService(
        fakeParaLeave("MEMBER", null, { deleteGrupo, updateGrupo }),
      );

      await service.leave("u2", "g1");

      expect(deleteGrupo).not.toHaveBeenCalled();
      expect(updateGrupo).not.toHaveBeenCalled();
    });

    it("dono passa a posse pro membro mais antigo", async () => {
      const updateMembro = vi.fn();
      const updateGrupo = vi.fn();
      const service = makeService(
        fakeParaLeave(
          "OWNER",
          { id: "m2", userId: "u2" },
          { updateMembro, updateGrupo },
        ),
      );

      await service.leave("u1", "g1");

      expect(updateMembro.mock.calls[0][0].data).toEqual({ role: "OWNER" });
      expect(updateGrupo.mock.calls[0][0].data).toEqual({ ownerId: "u2" });
    });

    it("ultimo a sair apaga o grupo", async () => {
      const deleteGrupo = vi.fn();
      const service = makeService(fakeParaLeave("OWNER", null, { deleteGrupo }));

      await service.leave("u1", "g1");

      // Senao sobraria um grupo sem ninguem dentro, eterno e inalcancavel.
      expect(deleteGrupo.mock.calls[0][0].where).toEqual({ id: "g1" });
    });

    it("sair de grupo alheio vira 404", async () => {
      const deleteMembro = vi.fn();
      const service = makeService(
        fakePrisma({
          groupMember: {
            findUnique: vi.fn().mockResolvedValue(null),
            delete: deleteMembro,
          },
        }),
      );

      await expect(service.leave("intruso", "g1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(deleteMembro).not.toHaveBeenCalled();
    });
  });
});
