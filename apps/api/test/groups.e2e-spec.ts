import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { ACHIEVEMENTS } from "../src/game/catalog";
import { PrismaService } from "../src/prisma/prisma.service";

const PASSWORD = "senha-de-teste-123";
const SP = "America/Sao_Paulo";

/** Ordem importa por causa das FKs. */
async function limpaTudo(prisma: PrismaService): Promise<void> {
  await prisma.setLog.deleteMany();
  await prisma.workoutSession.deleteMany();
  await prisma.planExercise.deleteMany();
  await prisma.planDay.deleteMany();
  await prisma.workoutPlan.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.bodyMetric.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.exercise.deleteMany();
}

describe("Groups (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenA = "";
  let tokenB = "";
  let tokenC = "";
  let exerciseId = "";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await limpaTudo(prisma);
    await app.close();
  });

  async function registra(
    apelido: string,
    name: string | null,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({
        email: `${apelido}-${Date.now()}-${Math.random()}@teste.com`,
        password: PASSWORD,
        name,
      })
      .expect(201);
    return res.body.token as string;
  }

  beforeEach(async () => {
    await limpaTudo(prisma);

    // O catalogo precisa existir pro XP das conquistas bater — depender de o
    // seed ter rodado deixaria o teste verde ou vermelho conforme a ordem dos
    // comandos na maquina.
    for (const a of ACHIEVEMENTS) {
      const dados = {
        code: a.code,
        name: a.name,
        description: a.description,
        icon: a.icon,
        xpReward: a.xpReward,
      };
      await prisma.achievement.upsert({
        where: { code: a.code },
        create: dados,
        update: dados,
      });
    }

    const exercicio = await prisma.exercise.create({
      data: {
        slug: "supino-groups",
        name: "Supino",
        muscleGroup: "CHEST",
        category: "COMPOUND",
        equipment: "BARBELL",
      },
    });
    exerciseId = exercicio.id;

    tokenA = await registra("ana", "Ana");
    tokenB = await registra("bia", "Bia");
    tokenC = await registra("caio", "Caio");
  });

  /**
   * Plano com um dia SEM dia da semana marcado.
   *
   * Sem agenda a sequencia sai "unscheduled" com current 0, entao o
   * multiplicador de XP e 1 — e a conta do leaderboard fica previsivel.
   */
  async function criaPlano(token: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/api/plans")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Plano",
        notes: null,
        days: [
          {
            name: "Push",
            focus: null,
            weekday: null,
            exercises: [
              {
                exerciseId,
                sets: 4,
                repScheme: "8-12",
                restSec: 120,
                notes: null,
              },
            ],
          },
        ],
      })
      .expect(201);
    return res.body.days[0].id as string;
  }

  /** Um treino inteiro, encerrado — vira historico e paga XP. */
  async function treina(
    token: string,
    planDayId: string,
    series: { weightKg: number; reps: number }[],
  ): Promise<string> {
    const abertura = await request(app.getHttpServer())
      .post("/api/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ planDayId })
      .expect(200);
    const sessionId = abertura.body.id as string;

    for (const [i, serie] of series.entries()) {
      await request(app.getHttpServer())
        .post(`/api/sessions/${sessionId}/logs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          exerciseId,
          setNumber: i + 1,
          weightKg: serie.weightKg,
          reps: serie.reps,
          rpe: null,
          completed: true,
        })
        .expect(200);
    }

    await request(app.getHttpServer())
      .patch(`/api/sessions/${sessionId}/finish`)
      .set("Authorization", `Bearer ${token}`)
      .send({ notes: null, tz: SP })
      .expect(200);

    return sessionId;
  }

  function criaGrupo(token: string, name = "Treta da Academia") {
    return request(app.getHttpServer())
      .post("/api/groups")
      .set("Authorization", `Bearer ${token}`)
      .send({ name, description: null });
  }

  function entra(token: string, code: string) {
    return request(app.getHttpServer())
      .post("/api/groups/join")
      .set("Authorization", `Bearer ${token}`)
      .send({ code });
  }

  function detalhe(token: string, id: string) {
    return request(app.getHttpServer())
      .get(`/api/groups/${id}`)
      .set("Authorization", `Bearer ${token}`);
  }

  function ranking(token: string, id: string, query = "") {
    return request(app.getHttpServer())
      .get(`/api/groups/${id}/leaderboard?tz=${encodeURIComponent(SP)}${query}`)
      .set("Authorization", `Bearer ${token}`);
  }

  function sai(token: string, id: string) {
    return request(app.getHttpServer())
      .delete(`/api/groups/${id}/leave`)
      .set("Authorization", `Bearer ${token}`);
  }

  describe("POST /groups", () => {
    it("exige autenticacao", async () => {
      await request(app.getHttpServer())
        .post("/api/groups")
        .send({ name: "X", description: null })
        .expect(401);
    });

    it("cria o grupo com quem criou ja dentro como dono", async () => {
      const res = await criaGrupo(tokenA).expect(201);

      expect(res.body.role).toBe("OWNER");
      expect(res.body.memberCount).toBe(1);
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].role).toBe("OWNER");
    });

    it("gera codigo de convite do alfabeto sem simbolos confundiveis", async () => {
      const res = await criaGrupo(tokenA).expect(201);

      expect(res.body.inviteCode).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
    });

    it("recusa nome vazio", async () => {
      await request(app.getHttpServer())
        .post("/api/groups")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "   ", description: null })
        .expect(400);
    });

    it("nao repete codigo entre grupos", async () => {
      const um = await criaGrupo(tokenA, "Um").expect(201);
      const dois = await criaGrupo(tokenA, "Dois").expect(201);

      expect(um.body.inviteCode).not.toBe(dois.body.inviteCode);
    });
  });

  describe("POST /groups/join", () => {
    it("entra pelo codigo e vira MEMBER", async () => {
      const grupo = await criaGrupo(tokenA).expect(201);

      const res = await entra(tokenB, grupo.body.inviteCode).expect(200);

      expect(res.body.role).toBe("MEMBER");
      expect(res.body.memberCount).toBe(2);
    });

    it("aceita o codigo em minuscula e com hifen", async () => {
      const grupo = await criaGrupo(tokenA).expect(201);
      const codigo = grupo.body.inviteCode as string;
      const bagunçado = `${codigo.toLowerCase().slice(0, 4)}-${codigo
        .toLowerCase()
        .slice(4)}`;

      await entra(tokenB, bagunçado).expect(200);
    });

    it("entrar duas vezes nao duplica a associacao", async () => {
      const grupo = await criaGrupo(tokenA).expect(201);

      await entra(tokenB, grupo.body.inviteCode).expect(200);
      const segunda = await entra(tokenB, grupo.body.inviteCode).expect(200);

      expect(segunda.body.memberCount).toBe(2);
      expect(await prisma.groupMember.count()).toBe(2);
    });

    it("codigo inexistente devolve 404", async () => {
      await entra(tokenB, "ZZZZZZZZ").expect(404);
    });

    it("codigo que normaliza pra vazio devolve 404", async () => {
      await entra(tokenB, "---").expect(404);
    });
  });

  describe("GET /groups", () => {
    it("lista so os grupos de quem pediu", async () => {
      const meu = await criaGrupo(tokenA, "Meu").expect(201);
      await criaGrupo(tokenB, "Alheio").expect(201);

      const res = await request(app.getHttpServer())
        .get("/api/groups")
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(meu.body.id);
    });
  });

  describe("GET /groups/:id", () => {
    it("mostra os membros pra quem e do grupo", async () => {
      const grupo = await criaGrupo(tokenA).expect(201);
      await entra(tokenB, grupo.body.inviteCode).expect(200);

      const res = await detalhe(tokenB, grupo.body.id).expect(200);

      expect(res.body.members).toHaveLength(2);
      expect(res.body.role).toBe("MEMBER");
    });

    it("NUNCA devolve o e-mail dos outros membros", async () => {
      // A unica tela onde um usuario le dados de outro. O contrato e nome e mais
      // nada — vazar contato aqui seria o pior defeito possivel desta fase.
      const grupo = await criaGrupo(tokenA).expect(201);
      await entra(tokenB, grupo.body.inviteCode).expect(200);

      const res = await detalhe(tokenB, grupo.body.id).expect(200);

      expect(JSON.stringify(res.body)).not.toContain("@teste.com");
      for (const membro of res.body.members) {
        expect(membro.email).toBeUndefined();
      }
    });

    it("troca nome vazio por Anonimo", async () => {
      const semNome = await registra("sem-nome", null);
      const grupo = await criaGrupo(tokenA).expect(201);
      await entra(semNome, grupo.body.inviteCode).expect(200);

      const res = await detalhe(tokenA, grupo.body.id).expect(200);
      const nomes = res.body.members.map((m: { name: string }) => m.name);

      expect(nomes).toContain("Anônimo");
    });
  });

  describe("GET /groups/:id/leaderboard", () => {
    it("comeca com todos zerados e empatados em primeiro", async () => {
      const grupo = await criaGrupo(tokenA).expect(201);
      await entra(tokenB, grupo.body.inviteCode).expect(200);

      const res = await ranking(tokenA, grupo.body.id).expect(200);

      expect(res.body.period).toBe("week");
      expect(res.body.metric).toBe("xp");
      expect(res.body.entries).toHaveLength(2);
      expect(
        res.body.entries.map((e: { position: number }) => e.position),
      ).toEqual([1, 1]);
    });

    it("aceita as quatro metricas e os tres periodos", async () => {
      const grupo = await criaGrupo(tokenA).expect(201);

      for (const metric of ["xp", "sessions", "volume", "streak"]) {
        for (const period of ["week", "month", "all"]) {
          const res = await ranking(
            tokenA,
            grupo.body.id,
            `&metric=${metric}&period=${period}`,
          ).expect(200);
          expect(res.body.metric).toBe(metric);
          // A sequencia ignora a janela e diz isso na resposta; as outras
          // metricas honram o periodo pedido.
          expect(res.body.period).toBe(metric === "streak" ? "all" : period);
        }
      }
    });

    /**
     * Ana treina mais que Bia, as duas no mesmo grupo.
     *
     * Contas (plano sem agenda, entao multiplicador 1):
     *  Ana: 4 series -> 50 + 5x4 = 70, + 50 do primeiro treino = 120 XP
     *       volume 4 x 10 reps x 60kg = 2400
     *  Bia: 1 serie  -> 50 + 5x1 = 55, + 50 do primeiro treino = 105 XP
     *       volume 1 x 10 reps x 50kg = 500
     */
    async function grupoComTreinos(): Promise<{
      groupId: string;
      sessaoDaAna: string;
    }> {
      const grupo = await criaGrupo(tokenA).expect(201);
      await entra(tokenB, grupo.body.inviteCode).expect(200);

      const diaDaAna = await criaPlano(tokenA);
      const diaDaBia = await criaPlano(tokenB);

      const sessaoDaAna = await treina(tokenA, diaDaAna, [
        { weightKg: 60, reps: 10 },
        { weightKg: 60, reps: 10 },
        { weightKg: 60, reps: 10 },
        { weightKg: 60, reps: 10 },
      ]);
      await treina(tokenB, diaDaBia, [{ weightKg: 50, reps: 10 }]);

      return { groupId: grupo.body.id as string, sessaoDaAna };
    }

    interface Entrada {
      name: string;
      value: number;
      position: number;
      behindLeader: number;
    }

    it("soma o XP da semana e ordena", async () => {
      const { groupId } = await grupoComTreinos();

      const res = await ranking(tokenA, groupId, "&metric=xp&period=week")
        .expect(200);
      const entradas = res.body.entries as Entrada[];

      expect(entradas.map((e) => [e.name, e.value])).toEqual([
        ["Ana", 120],
        ["Bia", 105],
      ]);
      expect(entradas.map((e) => e.position)).toEqual([1, 2]);
      expect(entradas.map((e) => e.behindLeader)).toEqual([0, 15]);
    });

    it("soma o volume da semana", async () => {
      const { groupId } = await grupoComTreinos();

      const res = await ranking(
        tokenA,
        groupId,
        "&metric=volume&period=week",
      ).expect(200);
      const entradas = res.body.entries as Entrada[];

      expect(entradas.map((e) => [e.name, e.value])).toEqual([
        ["Ana", 2400],
        ["Bia", 500],
      ]);
    });

    it("conta os treinos e empata quem fez o mesmo tanto", async () => {
      const { groupId } = await grupoComTreinos();

      const res = await ranking(
        tokenA,
        groupId,
        "&metric=sessions&period=week",
      ).expect(200);
      const entradas = res.body.entries as Entrada[];

      // Uma sessao cada: empate em primeiro, desempatado por nome.
      expect(entradas.map((e) => [e.name, e.value, e.position])).toEqual([
        ["Ana", 1, 1],
        ["Bia", 1, 1],
      ]);
    });

    /**
     * O teste que valida a fronteira do periodo.
     *
     * Empurra a sessao da Ana pra 60 dias atras: ela sai da semana e do mes,
     * mas o XP ja creditado continua no GameProfile. Sem uma fronteira correta
     * — e o volume calcula a dela em SQL cru, num caminho diferente do XP — a
     * semana continuaria contando o treino antigo e a lideranca nao viraria.
     */
    it("ignora o que caiu fora da janela, mas mantem no geral", async () => {
      const { groupId, sessaoDaAna } = await grupoComTreinos();
      await prisma.workoutSession.update({
        where: { id: sessaoDaAna },
        data: { date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
      });

      const semana = await ranking(
        tokenA,
        groupId,
        "&metric=xp&period=week",
      ).expect(200);
      expect((semana.body.entries as Entrada[]).map((e) => [e.name, e.value])).toEqual(
        [
          ["Bia", 105],
          ["Ana", 0],
        ],
      );

      const volumeSemana = await ranking(
        tokenA,
        groupId,
        "&metric=volume&period=week",
      ).expect(200);
      expect(
        (volumeSemana.body.entries as Entrada[]).map((e) => [e.name, e.value]),
      ).toEqual([
        ["Bia", 500],
        ["Ana", 0],
      ]);

      // No geral o XP acumulado nao se perde: a Ana volta a liderar.
      const geral = await ranking(
        tokenA,
        groupId,
        "&metric=xp&period=all",
      ).expect(200);
      expect((geral.body.entries as Entrada[]).map((e) => [e.name, e.value])).toEqual(
        [
          ["Ana", 120],
          ["Bia", 105],
        ],
      );
    });

    it("membro que nunca treinou fica zerado no fim, sem sumir", async () => {
      const { groupId } = await grupoComTreinos();
      const grupo = await detalhe(tokenA, groupId).expect(200);
      await entra(tokenC, grupo.body.inviteCode).expect(200);

      const res = await ranking(tokenA, groupId, "&metric=xp&period=week")
        .expect(200);
      const entradas = res.body.entries as Entrada[];

      expect(entradas).toHaveLength(3);
      expect(entradas[2]).toMatchObject({ name: "Caio", value: 0, position: 3 });
    });

    it("devolve period 'all' quando a metrica e sequencia", async () => {
      // A sequencia e sempre a de agora. Ecoar "month" faria a UI escrever
      // "sequencia do mes" — um numero que ninguem calculou.
      const grupo = await criaGrupo(tokenA).expect(201);

      const res = await ranking(
        tokenA,
        grupo.body.id,
        "&metric=streak&period=month",
      ).expect(200);

      expect(res.body.period).toBe("all");
    });

    it("recusa metrica desconhecida com 400", async () => {
      const grupo = await criaGrupo(tokenA).expect(201);

      await ranking(tokenA, grupo.body.id, "&metric=chutometro").expect(400);
    });

    it("exige o tz", async () => {
      const grupo = await criaGrupo(tokenA).expect(201);

      await request(app.getHttpServer())
        .get(`/api/groups/${grupo.body.id}/leaderboard`)
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(400);
    });
  });

  describe("DELETE /groups/:id/leave", () => {
    it("membro comum sai e some da lista", async () => {
      const grupo = await criaGrupo(tokenA).expect(201);
      await entra(tokenB, grupo.body.inviteCode).expect(200);

      await sai(tokenB, grupo.body.id).expect(204);

      const res = await detalhe(tokenA, grupo.body.id).expect(200);
      expect(res.body.members).toHaveLength(1);
    });

    it("dono que sai passa a posse pro membro mais antigo", async () => {
      const grupo = await criaGrupo(tokenA).expect(201);
      await entra(tokenB, grupo.body.inviteCode).expect(200);
      await entra(tokenC, grupo.body.inviteCode).expect(200);

      await sai(tokenA, grupo.body.id).expect(204);

      // Bia entrou antes de Caio, entao herda o grupo.
      const res = await detalhe(tokenB, grupo.body.id).expect(200);
      expect(res.body.role).toBe("OWNER");

      const grupoNoBanco = await prisma.group.findUniqueOrThrow({
        where: { id: grupo.body.id },
        select: { ownerId: true },
      });
      const dono = res.body.members.find(
        (m: { role: string }) => m.role === "OWNER",
      );
      expect(grupoNoBanco.ownerId).toBe(dono.userId);
    });

    it("ultimo a sair apaga o grupo", async () => {
      const grupo = await criaGrupo(tokenA).expect(201);

      await sai(tokenA, grupo.body.id).expect(204);

      expect(await prisma.group.count()).toBe(0);
      expect(await prisma.groupMember.count()).toBe(0);
    });

    it("sair de grupo que nao e seu devolve 404", async () => {
      const grupo = await criaGrupo(tokenA).expect(201);

      await sai(tokenB, grupo.body.id).expect(404);
    });
  });

  // O ataque e trivial: pegar o id de um grupo alheio e chamar as rotas. Todas
  // respondem 404, nunca 403 — um 403 confirmaria que o grupo existe.
  describe("IDOR: o grupo de outro usuario", () => {
    it("nao deixa ver o detalhe (nem o codigo de convite)", async () => {
      const alheio = await criaGrupo(tokenA).expect(201);

      await detalhe(tokenB, alheio.body.id).expect(404);
    });

    it("nao deixa ler o leaderboard", async () => {
      const alheio = await criaGrupo(tokenA).expect(201);

      await ranking(tokenB, alheio.body.id).expect(404);
    });

    it("nao deixa sair de um grupo em que nunca entrou", async () => {
      const alheio = await criaGrupo(tokenA).expect(201);

      await sai(tokenB, alheio.body.id).expect(404);
      // ...e o grupo continua intacto pro dono.
      await detalhe(tokenA, alheio.body.id).expect(200);
    });

    it("nao vaza grupo alheio na propria lista", async () => {
      const alheio = await criaGrupo(tokenA).expect(201);

      const res = await request(app.getHttpServer())
        .get("/api/groups")
        .set("Authorization", `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body.map((g: { id: string }) => g.id)).not.toContain(
        alheio.body.id,
      );
    });

    it("id inventado tambem devolve 404, nao 500", async () => {
      await detalhe(tokenA, "clxxxxxxxxxxxxxxxxxxxxxxx").expect(404);
    });
  });
});
