import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DB_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMG_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

interface FreeExercise {
  id: string;
  name: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  instructions: string[];
  images: string[];
}

// Free Exercise DB (muitos músculos) -> nossos 6 grupos.
const MUSCLE_MAP: Record<string, string> = {
  chest: "CHEST",
  back: "BACK",
  lats: "BACK",
  "middle back": "BACK",
  "lower back": "BACK",
  traps: "BACK",
  shoulders: "SHOULDERS",
  neck: "SHOULDERS",
  biceps: "ARMS",
  triceps: "ARMS",
  forearms: "ARMS",
  quadriceps: "LEGS",
  hamstrings: "LEGS",
  glutes: "LEGS",
  calves: "LEGS",
  abductors: "LEGS",
  adductors: "LEGS",
  abdominals: "CORE",
};

const EQUIP_MAP: Record<string, string> = {
  barbell: "BARBELL",
  "e-z curl bar": "BARBELL",
  dumbbell: "DUMBBELL",
  kettlebells: "DUMBBELL",
  cable: "CABLE",
  machine: "MACHINE",
  bands: "MACHINE",
  "exercise ball": "MACHINE",
  "medicine ball": "MACHINE",
  "foam roll": "MACHINE",
  other: "MACHINE",
  "body only": "BODYWEIGHT",
};

function mapMuscle(muscles: string[]): string {
  for (const m of muscles) {
    if (MUSCLE_MAP[m]) return MUSCLE_MAP[m];
  }
  return "CORE";
}

function mapEquip(equipment: string | null): string {
  return (equipment && EQUIP_MAP[equipment]) || "MACHINE";
}

async function main(): Promise<void> {
  const res = await fetch(DB_URL);
  if (!res.ok) throw new Error(`Falha ao baixar dataset: ${res.status}`);
  const all = (await res.json()) as FreeExercise[];
  const withImages = all.filter((e) => e.images && e.images.length > 0);

  const data = withImages.map((e) => {
    const category = e.mechanic === "compound" ? "COMPOUND" : "ISOLATION";
    return {
      slug: e.id,
      name: e.name,
      muscleGroup: mapMuscle(e.primaryMuscles ?? []),
      category,
      equipment: mapEquip(e.equipment),
      imageUrl: IMG_BASE + e.images[0],
      instructions: (e.instructions ?? []).join("\n") || null,
      defaultRestSec: category === "COMPOUND" ? 120 : 60,
    };
  });

  await prisma.exercise.deleteMany();
  const result = await prisma.exercise.createMany({ data, skipDuplicates: true });
  // eslint-disable-next-line no-console
  console.log(`Seed: ${result.count} exercícios inseridos.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
