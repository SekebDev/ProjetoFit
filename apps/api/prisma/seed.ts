import { PrismaClient } from "@prisma/client";
import { ACHIEVEMENTS } from "../src/game/catalog";

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
/** Upserts por transacao. Lotes grandes demais seguram locks por mais tempo. */
const SEED_CHUNK = 100;

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

  // Upsert por slug, nunca deleteMany: os planos referenciam Exercise.id, e
  // apagar/recriar regeraria os cuid() deixando PlanExercise apontando pro vazio.
  // O slug (id do dataset) e a chave natural estavel entre execucoes.
  //
  // Em lotes: um upsert por vez seriam ~900 idas e voltas ao banco.
  for (let i = 0; i < data.length; i += SEED_CHUNK) {
    const chunk = data.slice(i, i + SEED_CHUNK);
    await prisma.$transaction(
      chunk.map((item) =>
        prisma.exercise.upsert({
          where: { slug: item.slug },
          create: item,
          update: item,
        }),
      ),
    );
  }
  console.log(`Seed: ${data.length} exercícios sincronizados.`);

  await seedAchievements();
}

/**
 * Sincroniza o catalogo de conquistas.
 *
 * Upsert por `code`, nunca deleteMany — o mesmo motivo dos exercicios:
 * UserAchievement aponta pro Achievement.id, e apagar/recriar regeraria os
 * cuid(), fazendo sumir tudo que os usuarios ja desbloquearam.
 */
async function seedAchievements(): Promise<void> {
  const data = ACHIEVEMENTS.map((a) => ({
    code: a.code,
    name: a.name,
    description: a.description,
    icon: a.icon,
    xpReward: a.xpReward,
  }));

  await prisma.$transaction(
    data.map((item) =>
      prisma.achievement.upsert({
        where: { code: item.code },
        create: item,
        update: item,
      }),
    ),
  );
  console.log(`Seed: ${data.length} conquistas sincronizadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
