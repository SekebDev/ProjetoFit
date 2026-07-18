/**
 * Catalogo fixo de conquistas — a fonte da verdade.
 *
 * O banco tem a tabela Achievement porque UserAchievement referencia por FK,
 * mas quem manda e este arquivo: o seed le daqui e faz upsert por `code`.
 * Editar uma conquista aqui e rodar `prisma:seed` sincroniza sem perder o que
 * os usuarios ja desbloquearam (o vinculo e pelo id, que o upsert preserva).
 */

/**
 * De qual numero a conquista depende. Cada metrica vira um campo de
 * `UnlockStats`, e o desbloqueio e sempre "stat >= target".
 */
export type AchievementMetric =
  | "sessions"
  | "streakBest"
  | "prs"
  | "volume"
  | "earlyBird";

export interface AchievementDef {
  /** Chave estavel usada pelo codigo; o id do banco muda entre ambientes. */
  code: string;
  name: string;
  description: string;
  /** Emoji — renderizado direto, sem asset pra carregar. */
  icon: string;
  /** XP bonus creditado no desbloqueio. */
  xpReward: number;
  metric: AchievementMetric;
  /** Valor da metrica que desbloqueia. Serve tambem de denominador do progresso. */
  target: number;
}

/**
 * As metas sobem de forma nao-linear de proposito: a primeira de cada trilha e
 * quase de graca (dar o gostinho), e a ultima e longa o bastante pra ainda
 * significar algo depois de meses.
 */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    code: "FIRST_WORKOUT",
    name: "Primeiro treino",
    description: "Você apareceu. É por onde todo mundo começa.",
    icon: "🏋️",
    xpReward: 50,
    metric: "sessions",
    target: 1,
  },
  {
    code: "WORKOUTS_10",
    name: "Dez na conta",
    description: "10 treinos concluídos. Já virou hábito.",
    icon: "💪",
    xpReward: 100,
    metric: "sessions",
    target: 10,
  },
  {
    code: "WORKOUTS_50",
    name: "Meio século",
    description: "50 treinos concluídos. Frango nenhum chega aqui.",
    icon: "🔩",
    xpReward: 300,
    metric: "sessions",
    target: 50,
  },
  {
    code: "WORKOUTS_100",
    name: "Centenário",
    description: "100 treinos concluídos. Respeito.",
    icon: "🏆",
    xpReward: 750,
    metric: "sessions",
    target: 100,
  },
  {
    code: "STREAK_7",
    name: "Semana cheia",
    description: "7 dias agendados cumpridos em sequência.",
    icon: "🔥",
    xpReward: 100,
    metric: "streakBest",
    target: 7,
  },
  {
    code: "STREAK_30",
    name: "Mês inteiro",
    description: "30 dias agendados em sequência. Consistência pura.",
    icon: "🌋",
    xpReward: 400,
    metric: "streakBest",
    target: 30,
  },
  {
    code: "STREAK_100",
    name: "Cem sem falhar",
    description: "100 dias agendados cumpridos em sequência.",
    icon: "☄️",
    xpReward: 1200,
    metric: "streakBest",
    target: 100,
  },
  {
    code: "FIRST_PR",
    name: "Primeiro PR",
    description: "Você bateu seu próprio recorde pela primeira vez.",
    icon: "📈",
    xpReward: 75,
    metric: "prs",
    target: 1,
  },
  {
    code: "PRS_10",
    name: "Colecionador de PR",
    description: "10 recordes pessoais batidos.",
    icon: "🚀",
    xpReward: 250,
    metric: "prs",
    target: 10,
  },
  {
    code: "VOLUME_10T",
    name: "Dez toneladas",
    description: "10.000 kg levantados somando tudo.",
    icon: "🪨",
    xpReward: 150,
    metric: "volume",
    target: 10_000,
  },
  {
    code: "VOLUME_100T",
    name: "Cem toneladas",
    description: "100.000 kg levantados somando tudo. Isso é um prédio.",
    icon: "🗿",
    xpReward: 600,
    metric: "volume",
    target: 100_000,
  },
  {
    code: "EARLY_BIRD",
    name: "Madrugador",
    description: "Treinou antes das 6h, enquanto o mundo dormia.",
    icon: "🌅",
    xpReward: 100,
    metric: "earlyBird",
    target: 1,
  },
];
