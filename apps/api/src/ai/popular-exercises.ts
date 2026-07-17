/**
 * Os exercicios "populares" que a IA ve — o resto da biblioteca (873 no total)
 * continua disponivel pro usuario adicionar a mao no editor.
 *
 * Por que existe: mandar os ~680 exercicios do equipamento do usuario custava
 * ~34k tokens de prompt (e o dobro com o retry). Esta lista de ~120 canonicos
 * corta isso pra ~7k sem perder qualidade — sao os movimentos que um treinador
 * montaria um plano em cima de qualquer jeito, cobrindo cada grupo muscular em
 * cada tipo de equipamento.
 *
 * Sao slugs REAIS do banco (Free Exercise DB), colhidos por consulta e
 * validados na hora de escrever esta lista. Se o seed mudar os nomes e algum
 * slug parar de bater, nada quebra calado: a query de populares volta magra, o
 * buscaBiblioteca cai no fallback pra biblioteca inteira e loga um aviso — o
 * plano ainda sai, so mais caro em tokens ate a lista ser corrigida.
 */
export const POPULAR_EXERCISE_SLUGS: readonly string[] = [
  // ---- CHEST ----
  "Barbell_Bench_Press_-_Medium_Grip",
  "Barbell_Incline_Bench_Press_-_Medium_Grip",
  "Decline_Barbell_Bench_Press",
  "Dumbbell_Bench_Press",
  "Incline_Dumbbell_Press",
  "Decline_Dumbbell_Bench_Press",
  "Dumbbell_Flyes",
  "Incline_Dumbbell_Flyes",
  "Straight-Arm_Dumbbell_Pullover",
  "Cable_Crossover",
  "Low_Cable_Crossover",
  "Butterfly",
  "Machine_Bench_Press",
  "Smith_Machine_Bench_Press",
  "Smith_Machine_Incline_Bench_Press",
  "Dips_-_Chest_Version",
  "Incline_Push-Up",
  "Push-Up_Wide",

  // ---- BACK ----
  "Barbell_Deadlift",
  "Bent_Over_Barbell_Row",
  "T-Bar_Row_with_Handle",
  "Lying_T-Bar_Row",
  "One-Arm_Dumbbell_Row",
  "Bent_Over_Two-Dumbbell_Row",
  "Wide-Grip_Lat_Pulldown",
  "Close-Grip_Front_Lat_Pulldown",
  "Seated_Cable_Rows",
  "Straight-Arm_Pulldown",
  "Rope_Straight-Arm_Pulldown",
  "Barbell_Shrug",
  "Dumbbell_Shrug",
  "Hyperextensions_Back_Extensions",
  "Chin-Up",
  "Pullups",

  // ---- ARMS ----
  "Barbell_Curl",
  "Preacher_Curl",
  "Dumbbell_Bicep_Curl",
  "Incline_Dumbbell_Curl",
  "Seated_Dumbbell_Curl",
  "Hammer_Curls",
  "Cross_Body_Hammer_Curl",
  "Concentration_Curls",
  "Standing_Biceps_Cable_Curl",
  "Cable_Hammer_Curls_-_Rope_Attachment",
  "Cable_Preacher_Curl",
  "Machine_Bicep_Curl",
  "Machine_Preacher_Curls",
  "Close-Grip_Barbell_Bench_Press",
  "EZ-Bar_Skullcrusher",
  "Lying_Triceps_Press",
  "Seated_Triceps_Press",
  "Tricep_Dumbbell_Kickback",
  "Triceps_Pushdown",
  "Triceps_Pushdown_-_Rope_Attachment",
  "Reverse_Grip_Triceps_Pushdown",
  "Machine_Triceps_Extension",
  "Bench_Dips",
  "Dips_-_Triceps_Version",
  "Parallel_Bar_Dip",

  // ---- SHOULDERS ----
  "Barbell_Shoulder_Press",
  "Standing_Military_Press",
  "Dumbbell_Shoulder_Press",
  "Seated_Dumbbell_Press",
  "Standing_Dumbbell_Press",
  "Machine_Shoulder_Military_Press",
  "Kettlebell_Arnold_Press",
  "Side_Lateral_Raise",
  "Seated_Side_Lateral_Raise",
  "Side_Laterals_to_Front_Raise",
  "Front_Plate_Raise",
  "Reverse_Flyes",
  "Cable_Rear_Delt_Fly",
  "Seated_Bent-Over_Rear_Delt_Raise",
  "Barbell_Rear_Delt_Row",
  "Face_Pull",
  "Upright_Barbell_Row",

  // ---- LEGS ----
  "Barbell_Squat",
  "Barbell_Full_Squat",
  "Front_Squat_Clean_Grip",
  "Barbell_Hack_Squat",
  "Box_Squat",
  "Smith_Machine_Squat",
  "Dumbbell_Squat",
  "Plie_Dumbbell_Squat",
  "Goblet_Squat",
  "Split_Squats",
  "Romanian_Deadlift",
  "Sumo_Deadlift",
  "Stiff-Legged_Barbell_Deadlift",
  "Good_Morning",
  "Barbell_Lunge",
  "Barbell_Walking_Lunge",
  "Dumbbell_Lunges",
  "Leg_Press",
  "Leg_Extensions",
  "Lying_Leg_Curls",
  "Seated_Leg_Curl",
  "Standing_Leg_Curl",
  "Thigh_Adductor",
  "Thigh_Abductor",
  "Barbell_Hip_Thrust",
  "Barbell_Glute_Bridge",
  "Glute_Kickback",
  "Glute_Ham_Raise",
  "Standing_Calf_Raises",
  "Seated_Calf_Raise",
  "Donkey_Calf_Raises",
  "Calf_Press_On_The_Leg_Press_Machine",
  "Smith_Machine_Calf_Raise",

  // ---- CORE ----
  "Plank",
  "Hanging_Leg_Raise",
  "Sit-Up",
  "Decline_Crunch",
  "Cross-Body_Crunch",
  "Russian_Twist",
  "Cable_Crunch",
  "Cable_Russian_Twists",
  "Standing_Cable_Wood_Chop",
  "Ab_Roller",
];

/**
 * Abaixo disto, a intersecao lista∩equipamento e magra demais pra IA montar um
 * plano decente (ex.: usuario so com CABLE). Nesse caso o AiService volta pra
 * biblioteca inteira do equipamento — melhor um prompt caro que um plano pobre.
 */
export const MIN_POPULAR_PARA_FILTRAR = 12;
