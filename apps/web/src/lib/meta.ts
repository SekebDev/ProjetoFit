import type { Exercise } from "@workout/shared";

type Muscle = Exercise["muscleGroup"];
type Equip = Exercise["equipment"];
type Category = Exercise["category"];

export const MUSCLE_META: Record<Muscle, { label: string; color: string }> = {
  CHEST: { label: "Peito", color: "var(--m-chest)" },
  BACK: { label: "Costas", color: "var(--m-back)" },
  SHOULDERS: { label: "Ombros", color: "var(--m-shoulders)" },
  ARMS: { label: "Braços", color: "var(--m-arms)" },
  LEGS: { label: "Pernas", color: "var(--m-legs)" },
  CORE: { label: "Core", color: "var(--m-core)" },
};

export const MUSCLE_ORDER: Muscle[] = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "ARMS",
  "LEGS",
  "CORE",
];

export const EQUIP_LABELS: Record<Equip, string> = {
  BARBELL: "Barra",
  DUMBBELL: "Halteres",
  MACHINE: "Máquina",
  CABLE: "Cabo",
  BODYWEIGHT: "Peso corporal",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  COMPOUND: "Composto",
  ISOLATION: "Isolado",
};
