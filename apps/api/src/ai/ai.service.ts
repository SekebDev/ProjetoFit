import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  aiPlanToCreateInput,
  AiPlanSchema,
  CreatePlanSchema,
  type AiPlan,
  type CreatePlanInput,
  type GeneratePlanInput,
  type Plan,
} from "@workout/shared";
import { zodTextFormat } from "openai/helpers/zod";
import { PlansService } from "../plans/plans.service";
import { PrismaService } from "../prisma/prisma.service";
import { OPENAI, type OpenAiClient } from "./openai.provider";
import {
  MIN_POPULAR_PARA_FILTRAR,
  POPULAR_EXERCISE_SLUGS,
} from "./popular-exercises";

/**
 * `terra` e nao `sol`: gerar um plano e uma chamada pontual, e o equilibrio
 * inteligencia/custo e o recomendado pra este uso. Trocar pelo flagship so se a
 * qualidade decepcionar no uso real.
 */
const MODEL = "gpt-5.6-terra";

/** Uma segunda chance, informada. Ver o comentario em `pedeAIA`. */
const MAX_TENTATIVAS = 2;

const SYSTEM_PROMPT = `
Você é um treinador de força e hipertrofia.
Monte um plano de treino seguro e eficaz seguindo estas regras:
- Respeite os dias/semana, o objetivo e as áreas de foco do perfil.
- Use SOMENTE exercícios da lista fornecida, referenciando pelo campo "slug".
- Copie o slug EXATAMENTE como aparece na lista, sem inventar nem alterar.
- Se o usuário for "RETURNING", aplique readaptação: comece com volume moderado.
- Considere lesões informadas e evite exercícios de risco pra elas.
- Distribua o volume de forma coerente entre os dias.
- repScheme deve ser "8" ou um intervalo como "8-12". Nunca use texto livre.
- restSec em segundos, entre 0 e 600.
- Escreva os nomes dos dias, o foco e o resumo em português do Brasil.
`.trim();

/** O que a IA ve de cada exercicio. Sem o id: o cuid so serviria pra ela errar. */
interface ExercicioDoPrompt {
  slug: string;
  name: string;
  muscleGroup: string;
}

interface ExercicioPermitido extends ExercicioDoPrompt {
  id: string;
}

/** So o que o prompt precisa saber do perfil. */
interface PerfilDoPrompt {
  equipment: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlansService,
    @Inject(OPENAI) private readonly openai: OpenAiClient,
  ) {}

  async generate(userId: string, input: GeneratePlanInput): Promise<Plan> {
    if (!this.openai) {
      throw new ServiceUnavailableException(
        "A geração por IA não está configurada neste servidor",
      );
    }

    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException("Preencha seu perfil antes de gerar um plano");
    }

    const library = await this.buscaBiblioteca(profile.equipment);
    if (library.length === 0) {
      throw new BadGatewayException(
        "Nenhum exercício disponível para o equipamento do seu perfil",
      );
    }

    const planoInput = await this.pedeAIA(profile, library, input.notes);
    // source "AI" e o que separa este plano dos manuais na listagem.
    return this.plans.create(userId, planoInput, "AI");
  }

  /**
   * Os exercicios que a IA pode usar: os populares que o equipamento permite.
   *
   * Dois filtros, duas razoes:
   * - equipamento: impede prescrever supino com barra pra quem so tem halteres —
   *   a IA nem fica sabendo que o exercicio existe.
   * - lista de populares: manda ~60 canonicos em vez dos ~680 do equipamento,
   *   cortando o prompt de ~34k tokens pra ~5k. O resto da biblioteca segue
   *   disponivel pro usuario adicionar a mao — so a IA nao o ve.
   *
   * Fallback pra biblioteca inteira quando a intersecao fica magra (equipamento
   * incomum): melhor um prompt caro que um plano pobre.
   */
  private async buscaBiblioteca(
    equipment: string[],
  ): Promise<ExercicioPermitido[]> {
    // Perfil sem equipamento marcado = sem filtro de equipamento. Preferivel a
    // devolver zero exercicios por um campo que o usuario deixou em branco.
    const porEquipamento =
      equipment.length > 0 ? { equipment: { in: equipment } } : {};
    const select = { id: true, slug: true, name: true, muscleGroup: true };

    const populares = await this.prisma.exercise.findMany({
      where: { ...porEquipamento, slug: { in: [...POPULAR_EXERCISE_SLUGS] } },
      select,
      orderBy: { name: "asc" },
    });
    if (populares.length >= MIN_POPULAR_PARA_FILTRAR) {
      return populares;
    }

    this.logger.warn(
      `So ${populares.length} exercicios populares p/ o equipamento; usando a biblioteca inteira`,
    );
    return this.prisma.exercise.findMany({
      where: porEquipamento,
      select,
      orderBy: { name: "asc" },
    });
  }

  /**
   * Chama a OpenAI e valida o que voltou. Uma segunda tentativa, informada.
   *
   * O retry manda de volta EXATAMENTE o que deu errado (os slugs inventados, ou
   * o erro do Zod). Repetir o mesmo prompt esperando sorte seria pagar duas
   * vezes pelo mesmo palpite; dizer o que quebrou da a ela o que corrigir.
   *
   * Devolve ja o CreatePlanInput (slug -> id resolvido), pronto pra persistir.
   */
  private async pedeAIA(
    profile: PerfilDoPrompt,
    library: ExercicioPermitido[],
    notes: string | null,
  ): Promise<CreatePlanInput> {
    const slugToId = new Map(library.map((e) => [e.slug, e.id]));
    let correcao = "";

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
      const plano = await this.chama(profile, library, notes, correcao);

      const invalidos = [
        ...new Set(
          plano.days
            .flatMap((d) => d.exercises.map((e) => e.slug))
            .filter((slug) => !slugToId.has(slug)),
        ),
      ];

      if (invalidos.length > 0) {
        // Log pra diagnosticar: se a IA continua inventando slug apesar do
        // retry, e aqui que se ve — sem imprimir o plano inteiro nem dado do
        // usuario.
        this.logger.warn(
          `Tentativa ${tentativa}: ${invalidos.length} slug(s) fora da lista`,
        );
        correcao = `Estes slugs NÃO existem na lista e não podem ser usados: ${invalidos.join(
          ", ",
        )}. Refaça usando apenas o campo "slug" exatamente como aparece na lista.`;
        continue;
      }

      // A mesma validacao do editor manual: se o CreatePlanSchema recusaria, a
      // IA errou valor (series demais, repScheme em texto livre) e nao forma.
      const input = aiPlanToCreateInput(plano, slugToId);
      const conferido = CreatePlanSchema.safeParse(input);
      if (conferido.success) {
        return input;
      }
      this.logger.warn(
        `Tentativa ${tentativa}: plano com ${conferido.error.issues.length} valor(es) inválido(s)`,
      );
      correcao = `O plano tem valores inválidos: ${conferido.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .slice(0, 5)
        .join("; ")}. Corrija e refaça.`;
    }

    throw new BadGatewayException(
      "A IA não conseguiu montar um plano válido. Tente de novo.",
    );
  }

  private async chama(
    profile: PerfilDoPrompt,
    library: ExercicioPermitido[],
    notes: string | null,
    correcao: string,
  ): Promise<AiPlan> {
    // So slug/name/muscleGroup no prompt: mandar o cuid so daria a ela um jeito
    // a mais de errar, e ela nunca precisa dele — o servidor resolve o id.
    const paraPrompt: ExercicioDoPrompt[] = library.map((e) => ({
      slug: e.slug,
      name: e.name,
      muscleGroup: e.muscleGroup,
    }));

    const conteudo = [
      `PERFIL:\n${JSON.stringify(profile)}`,
      `EXERCÍCIOS PERMITIDOS:\n${JSON.stringify(paraPrompt)}`,
      notes ? `PEDIDO DO ALUNO:\n${notes}` : "",
      correcao ? `CORREÇÃO NECESSÁRIA:\n${correcao}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    // O `!` e seguro: o generate ja lancou 503 se o cliente fosse null, e este
    // metodo e privado — nao ha outro caminho ate aqui.
    const res = await this.openai!.responses.parse({
      model: MODEL,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: conteudo },
      ],
      text: { format: zodTextFormat(AiPlanSchema, "workout_plan") },
    });

    // null quando a IA recusou (refusal) ou a resposta truncou. Nos dois casos
    // nao ha o que salvar — e um 502 honesto e melhor que um plano pela metade.
    if (!res.output_parsed) {
      throw new BadGatewayException("A IA não devolveu um plano. Tente de novo.");
    }
    return res.output_parsed;
  }
}
