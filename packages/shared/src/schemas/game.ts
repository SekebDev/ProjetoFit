import { z } from "zod";

/**
 * XP e nivel do usuario (GET /game).
 *
 * Diferente da sequencia, isto e estado PERSISTIDO: o XP e somado ao fechar
 * cada sessao, usando a sequencia daquele momento como multiplicador. Derivar
 * do historico exigiria reconstruir a sequencia de cada treino passado.
 */
export const GameSchema = z.object({
  xp: z.number().int(),
  level: z.number().int(),
  /** XP ja acumulado dentro do nivel atual — o numerador da barra. */
  xpIntoLevel: z.number().int(),
  /** XP que o nivel atual custa do inicio ao fim — o denominador da barra. */
  xpForNextLevel: z.number().int(),
});
export type Game = z.infer<typeof GameSchema>;

/**
 * Uma conquista do catalogo, com o progresso do usuario.
 *
 * `unlockedAt` null = ainda bloqueada; a UI usa isso pra decidir entre o card
 * colorido e o card apagado com a barra de progresso.
 */
export const AchievementSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  /** Emoji. */
  icon: z.string(),
  xpReward: z.number().int(),
  /** Meta da metrica que desbloqueia. */
  target: z.number(),
  /** Quanto o usuario ja andou, limitado a `target`. */
  progress: z.number(),
  unlockedAt: z.string().nullable(),
});
export type Achievement = z.infer<typeof AchievementSchema>;

/**
 * O que uma sessao rendeu (campo `reward` do PATCH /sessions/:id/finish).
 *
 * Null quando o finish nao concedeu nada — o caso do retry, em que a sessao ja
 * estava fechada e o XP ja foi pago. E o que impede a UI de comemorar duas
 * vezes o mesmo treino.
 */
export const SessionRewardSchema = z.object({
  /** XP total creditado, ja incluindo o bonus das conquistas novas. */
  xpGained: z.number().int(),
  /** Quanto do `xpGained` veio de conquista desbloqueada. */
  xpFromAchievements: z.number().int(),
  /** Multiplicador da sequencia aplicado (0.2 = +20%), pra UI poder exibi-lo. */
  streakBonus: z.number(),
  levelBefore: z.number().int(),
  levelAfter: z.number().int(),
  /** Atalho de `levelAfter > levelBefore` — a UI dispara a comemoracao com isto. */
  leveledUp: z.boolean(),
  unlocked: z.array(AchievementSchema),
});
export type SessionReward = z.infer<typeof SessionRewardSchema>;
