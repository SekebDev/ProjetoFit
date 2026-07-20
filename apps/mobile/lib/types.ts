/**
 * Espelho dos tipos de `packages/shared/src/schemas`.
 *
 * A fonte de verdade e o pacote @workout/shared; ele nao esta linkado aqui
 * porque o app mobile foi instalado com npm dentro de um workspace pnpm, e
 * puxar o workspace pra dentro do Metro nesse estado misto quebra o bundle.
 * Enquanto isso nao for resolvido, qualquer mudanca de schema no servidor
 * precisa ser refletida aqui a mao.
 */

export type MuscleGroup =
  | "CHEST"
  | "BACK"
  | "SHOULDERS"
  | "ARMS"
  | "LEGS"
  | "CORE";

export type ExerciseCategory = "COMPOUND" | "ISOLATION";

export type ExerciseEquipment =
  | "BARBELL"
  | "DUMBBELL"
  | "MACHINE"
  | "CABLE"
  | "BODYWEIGHT";

export type Exercise = {
  id: string;
  slug: string;
  name: string;
  muscleGroup: MuscleGroup;
  category: ExerciseCategory;
  equipment: ExerciseEquipment;
  imageUrl: string | null;
  videoUrl: string | null;
  instructions: string | null;
  defaultRestSec: number;
};

export type PlanSource = "MANUAL" | "AI";

/** Item de GET /plans. */
export type PlanSummary = {
  id: string;
  name: string;
  source: PlanSource;
  isActive: boolean;
  createdAt: string;
  dayCount: number;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
};

export type GroupRole = "OWNER" | "MEMBER";

/** Item de GET /groups. */
export type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  role: GroupRole;
  createdAt: string;
};

export type LeaderboardPeriod = "week" | "month" | "all";
export type LeaderboardMetric = "xp" | "sessions" | "volume" | "streak";

export type LeaderboardEntry = {
  userId: string;
  name: string;
  /** Na unidade da metrica: XP, nº de treinos, kg ou dias. */
  value: number;
  /** 1-based. Empatados dividem a mesma posicao (1, 2, 2, 4). */
  position: number;
  behindLeader: number;
};

export type Leaderboard = {
  period: LeaderboardPeriod;
  metric: LeaderboardMetric;
  entries: LeaderboardEntry[];
};

/** GET /plans/next-workout — o proximo treino sugerido no painel. */
export type NextWorkout = {
  planId: string;
  planName: string;
  planDayId: string;
  name: string;
  focus: string | null;
  weekday: number | null;
  isToday: boolean;
};

export type StreakState =
  | "unscheduled"
  | "idle"
  | "active"
  | "resting"
  | "atRisk";

/** GET /progress/streak. */
export type Streak = {
  current: number;
  best: number;
  state: StreakState;
  scheduledToday: boolean;
  trainedToday: boolean;
};

/** GET /progress/deload. */
export type Deload = {
  recommend: boolean;
  reason: "FATIGUE" | "CYCLE" | "BOTH" | null;
  lastWeekVolume: number | null;
  baselineVolume: number | null;
  dropPct: number | null;
  hardWeekStreak: number;
};

export type WeeklyVolume = {
  weekStart: string;
  volume: number;
  sessionCount: number;
};

export type PersonalRecord = {
  exercise: { id: string; name: string };
  maxWeightKg: number | null;
  maxWeightDate: string | null;
  maxVolume: number | null;
  maxVolumeDate: string | null;
};

/** GET /progress/summary. */
export type ProgressSummary = {
  weeklyVolume: WeeklyVolume[];
  records: PersonalRecord[];
  totalSessions: number;
};

/**
 * GET /sessions/active — a sessao em aberto, ou null.
 *
 * Subconjunto de Session: o painel so precisa saber que ha um treino em curso e
 * como rotular o card pra retomar. A tela de treino busca o resto sozinha.
 */
export type ActiveSession = {
  id: string;
  planDayId: string | null;
  planDay: { name: string } | null;
  date: string;
};

/** Rotulos pt-BR para os enums que a API devolve em ingles. */
export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  CHEST: "Peito",
  BACK: "Costas",
  SHOULDERS: "Ombros",
  ARMS: "Braços",
  LEGS: "Pernas",
  CORE: "Core",
};

export const LEADERBOARD_METRIC_LABELS: Record<LeaderboardMetric, string> = {
  xp: "XP",
  sessions: "treinos",
  volume: "kg",
  streak: "dias",
};
