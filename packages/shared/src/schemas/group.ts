import { z } from "zod";

/**
 * Teto de membros por grupo.
 *
 * O leaderboard soma metricas de cada membro a cada leitura, sem snapshot. Um
 * grupo de 500 pessoas transformaria a tela num scan pesado a cada F5 — e um
 * grupo de treino grande assim nao e o caso de uso.
 */
export const GROUP_MAX_MEMBERS = 50;

// ---------- entrada ----------

export const CreateGroupSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(300).nullable(),
});
export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;

/**
 * POST /groups/join — o codigo como o usuario digitou.
 *
 * O servidor normaliza (maiuscula, sem espaco nem hifen) antes de procurar,
 * entao aqui o limite e generoso de proposito: quem colou de uma mensagem pode
 * trazer pontuacao junto.
 */
export const JoinGroupSchema = z.object({
  code: z.string().trim().min(1).max(32),
});
export type JoinGroupInput = z.infer<typeof JoinGroupSchema>;

// ---------- saida ----------

export const GroupRoleSchema = z.enum(["OWNER", "MEMBER"]);
export type GroupRole = z.infer<typeof GroupRoleSchema>;

/**
 * Um membro como os OUTROS membros o veem.
 *
 * So `name`, nunca e-mail: e a unica tela do app onde um usuario le dados de
 * outro. Quem nao preencheu o nome aparece como "Anônimo" — resolvido no
 * servidor pra nao sobrar decisao de privacidade espalhada pela UI.
 */
export const GroupMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  role: GroupRoleSchema,
  joinedAt: z.string(),
});
export type GroupMember = z.infer<typeof GroupMemberSchema>;

/** Item da lista GET /groups — sem os membros, so o resumo. */
export const GroupSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  memberCount: z.number().int(),
  /** O papel de QUEM PEDIU, nao do dono. */
  role: GroupRoleSchema,
  createdAt: z.string(),
});
export type GroupSummary = z.infer<typeof GroupSummarySchema>;

/**
 * GET /groups/:id — o detalhe, so pra quem e membro.
 *
 * O `inviteCode` vem junto porque convidar gente e coisa de membro, nao
 * privilegio do dono. Quem nao e membro nem chega aqui: a rota devolve 404.
 */
export const GroupSchema = GroupSummarySchema.extend({
  inviteCode: z.string(),
  members: z.array(GroupMemberSchema),
});
export type Group = z.infer<typeof GroupSchema>;

// ---------- leaderboard ----------

/**
 * Janela do ranking.
 *
 * `week` e `month` somam o que cada sessao rendeu (WorkoutSession.xpGained);
 * `all` le o total acumulado do perfil. A diferenca importa: sessoes anteriores
 * a coluna de XP valem 0 no recorte por periodo, mas continuam no total.
 */
export const LeaderboardPeriodSchema = z.enum(["week", "month", "all"]);
export type LeaderboardPeriod = z.infer<typeof LeaderboardPeriodSchema>;

export const LeaderboardMetricSchema = z.enum([
  "xp",
  "sessions",
  "volume",
  "streak",
]);
export type LeaderboardMetric = z.infer<typeof LeaderboardMetricSchema>;

export const LeaderboardEntrySchema = z.object({
  userId: z.string(),
  name: z.string(),
  /** Na unidade da metrica: XP, nº de treinos, kg ou dias. */
  value: z.number(),
  /** 1-based. Empatados dividem a mesma posicao (1, 2, 2, 4). */
  position: z.number().int(),
  /** Quanto falta pra alcancar o primeiro. 0 pra quem lidera. */
  behindLeader: z.number(),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export const LeaderboardSchema = z.object({
  period: LeaderboardPeriodSchema,
  metric: LeaderboardMetricSchema,
  entries: z.array(LeaderboardEntrySchema),
});
export type Leaderboard = z.infer<typeof LeaderboardSchema>;
