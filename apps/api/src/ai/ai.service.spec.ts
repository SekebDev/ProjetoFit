import {
  BadGatewayException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { AiPlan } from "@workout/shared";
import { describe, expect, it, vi } from "vitest";
import { AiService } from "./ai.service";

/**
 * Nenhum teste aqui fala com a OpenAI.
 *
 * Nao e economia de tempo: chamar de verdade custaria dinheiro a cada rodada,
 * nao seria deterministico (a mesma entrada da planos diferentes) e o CI nao
 * tem chave. O que estes testes provam e o NOSSO codigo — retry, validacao,
 * mapeamento, persistencia. Que o prompt produza um plano BOM e outra pergunta,
 * e so o uso real responde.
 */

const SUPINO = {
  id: "e1",
  slug: "supino_reto",
  name: "Supino reto",
  muscleGroup: "CHEST",
};
const AGACHO = {
  id: "e2",
  slug: "agachamento",
  name: "Agachamento",
  muscleGroup: "LEGS",
};

const PERFIL = {
  id: "p1",
  userId: "u1",
  equipment: ["BARBELL"],
  goal: "HYPERTROPHY",
  experience: "INTERMEDIATE",
  daysPerWeek: 3,
};

function planoValido(over: Partial<AiPlan> = {}): AiPlan {
  return {
    name: "Plano Gerado",
    summary: "Foco em hipertrofia.",
    days: [
      {
        name: "Push",
        focus: "Peito",
        exercises: [
          {
            slug: "supino_reto",
            sets: 3,
            repScheme: "8-12",
            restSec: 120,
            notes: null,
          },
        ],
      },
    ],
    ...over,
  };
}

/** Plano com um exercicio que a IA inventou — nao esta na biblioteca. */
function planoComIdInventado(): AiPlan {
  return planoValido({
    days: [
      {
        name: "Push",
        focus: "Peito",
        exercises: [
          {
            slug: "nao-existe",
            sets: 3,
            repScheme: "8-12",
            restSec: 120,
            notes: null,
          },
        ],
      },
    ],
  });
}

interface Opcoes {
  respostas?: (AiPlan | null)[];
  semChave?: boolean;
  profile?: unknown;
  library?: unknown[];
}

function criaService(o: Opcoes = {}) {
  const parse = vi.fn();
  for (const r of o.respostas ?? [planoValido()]) {
    parse.mockResolvedValueOnce({ output_parsed: r });
  }

  const prisma = {
    profile: {
      findUnique: vi.fn().mockResolvedValue("profile" in o ? o.profile : PERFIL),
    },
    exercise: {
      findMany: vi.fn().mockResolvedValue(o.library ?? [SUPINO, AGACHO]),
    },
  };
  const plans = {
    create: vi
      .fn()
      .mockImplementation((_u, input) => ({ id: "novo", ...input })),
  };
  const openai = o.semChave ? null : { responses: { parse } };

  return {
    service: new AiService(prisma as never, plans as never, openai as never),
    prisma,
    plans,
    parse,
  };
}

/** O texto que foi mandado pra IA na n-esima chamada. */
function conteudoDaChamada(parse: ReturnType<typeof vi.fn>, n: number): string {
  return parse.mock.calls[n][0].input[1].content as string;
}

describe("AiService", () => {
  describe("guardas", () => {
    it("sem chave configurada devolve 503, e nao quebra o app", async () => {
      const { service } = criaService({ semChave: true });

      await expect(service.generate("u1", { notes: null })).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it("sem perfil preenchido devolve 404", async () => {
      const { service } = criaService({ profile: null });

      await expect(service.generate("u1", { notes: null })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("biblioteca vazia devolve 502 em vez de chamar a IA a toa", async () => {
      const { service, parse } = criaService({ library: [] });

      await expect(service.generate("u1", { notes: null })).rejects.toThrow(
        BadGatewayException,
      );
      expect(parse).not.toHaveBeenCalled();
    });
  });

  describe("biblioteca", () => {
    it("filtra os exercicios pelo equipamento do perfil", async () => {
      const { service, prisma } = criaService();

      await service.generate("u1", { notes: null });

      expect(prisma.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { equipment: { in: ["BARBELL"] } } }),
      );
    });

    it("perfil sem equipamento marcado usa a biblioteca inteira", async () => {
      const { service, prisma } = criaService({
        profile: { ...PERFIL, equipment: [] },
      });

      await service.generate("u1", { notes: null });

      expect(prisma.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it("filtra pela lista de populares quando ha exercicios suficientes", async () => {
      // 12+ populares (o teto do fallback): a query de populares basta, e o
      // buscaBiblioteca NAO cai na biblioteca inteira.
      const grande = Array.from({ length: 12 }, (_, i) => ({
        id: `e${i}`,
        slug: i === 0 ? "supino_reto" : `popular_${i}`,
        name: `Exercicio ${i}`,
        muscleGroup: "CHEST",
      }));
      const { service, prisma } = criaService({ library: grande });

      await service.generate("u1", { notes: null });

      // Uma chamada so = sem fallback. E o where inclui o filtro de slug.
      expect(prisma.exercise.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ slug: { in: expect.any(Array) } }),
        }),
      );
    });
  });

  describe("sucesso", () => {
    it("persiste o plano com source AI", async () => {
      const { service, plans } = criaService();

      await service.generate("u1", { notes: null });

      expect(plans.create).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ name: "Plano Gerado" }),
        "AI",
      );
    });

    it("o summary da IA vira as notas do plano", async () => {
      const { service, plans } = criaService();

      await service.generate("u1", { notes: null });

      expect(plans.create.mock.calls[0][1].notes).toBe("Foco em hipertrofia.");
    });

    it("manda o pedido do aluno no prompt quando ha um", async () => {
      const { service, parse } = criaService();

      await service.generate("u1", { notes: "quero focar em ombro" });

      expect(conteudoDaChamada(parse, 0)).toContain("quero focar em ombro");
    });

    it("chama a IA uma vez so quando o plano ja vem valido", async () => {
      const { service, parse } = criaService();

      await service.generate("u1", { notes: null });

      expect(parse).toHaveBeenCalledTimes(1);
    });
  });

  describe("retry", () => {
    it("id inventado dispara uma segunda chamada dizendo qual id era", async () => {
      const { service, parse } = criaService({
        respostas: [planoComIdInventado(), planoValido()],
      });

      await service.generate("u1", { notes: null });

      expect(parse).toHaveBeenCalledTimes(2);
      // O ponto do retry informado: a segunda chamada sabe o que corrigir.
      const segunda = conteudoDaChamada(parse, 1);
      expect(segunda).toContain("nao-existe");
      expect(segunda).toMatch(/CORREÇÃO NECESSÁRIA/);
    });

    it("id inventado duas vezes vira 502, e nao um plano quebrado", async () => {
      const { service, parse } = criaService({
        respostas: [planoComIdInventado(), planoComIdInventado()],
      });

      await expect(service.generate("u1", { notes: null })).rejects.toThrow(
        BadGatewayException,
      );
      // Duas e o teto: nao fica tentando (e cobrando) pra sempre.
      expect(parse).toHaveBeenCalledTimes(2);
    });

    it("valor invalido tambem dispara retry, com o erro do Zod", async () => {
      // repScheme em texto livre: o editor manual recusaria, entao a IA errou.
      const ruim = planoValido({
        days: [
          {
            name: "Push",
            focus: "Peito",
            exercises: [
              {
                slug: "supino_reto",
                sets: 3,
                repScheme: "AMRAP",
                restSec: 120,
                notes: null,
              },
            ],
          },
        ],
      });
      const { service, parse } = criaService({
        respostas: [ruim, planoValido()],
      });

      await service.generate("u1", { notes: null });

      expect(parse).toHaveBeenCalledTimes(2);
      expect(conteudoDaChamada(parse, 1)).toContain("repScheme");
    });

    it("nao persiste nada quando as duas tentativas falham", async () => {
      const { service, plans } = criaService({
        respostas: [planoComIdInventado(), planoComIdInventado()],
      });

      await expect(service.generate("u1", { notes: null })).rejects.toThrow();
      expect(plans.create).not.toHaveBeenCalled();
    });
  });

  describe("resposta imprestavel", () => {
    it("refusal ou truncamento (output_parsed null) vira 502", async () => {
      const { service } = criaService({ respostas: [null] });

      await expect(service.generate("u1", { notes: null })).rejects.toThrow(
        BadGatewayException,
      );
    });
  });
});
