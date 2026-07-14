# WorkoutApp — Plano de Implementação & Arquitetura

Documento pra guiar a construção de um app de treino pessoal com **NestJS** (backend) + **Next.js** (frontend), com biblioteca de exercícios com imagens, registro de progressão, timer de descanso e um gerador de planos por IA baseado no perfil. Escrito pra ser entregue ao **Claude Code** em fases — cada fase é um bloco de trabalho fechado e testável.

---

## 1. Visão geral e escopo

App de uso pessoal (1 usuário, dá pra expandir depois) para:

- Consultar uma **biblioteca de exercícios** com imagem, músculo e execução.
- Montar **planos de treino** manualmente ou gerados por **IA** a partir do perfil.
- Executar o treino do dia com **registro de séries** (carga, reps, RPE) e **timer de descanso**.
- Acompanhar **progressão** (volume, recordes, peso corporal) em gráficos.

Prioridades: simplicidade, rodar local sem fricção, e um schema de dados bem feito desde o início (é o que dá liberdade pras features).

---

## 2. Stack e decisões

| Camada | Escolha | Por quê |
|--------|---------|---------|
| Frontend | Next.js (App Router) + TypeScript | SSR/rotas simples, ótimo pra PWA |
| UI | Tailwind + shadcn/ui | Componentes prontos, rápido de estilizar |
| Estado/dados | TanStack Query | Cache e sincronização com a API sem boilerplate |
| Gráficos | Recharts | Leve e suficiente pra volume/progressão |
| Backend | NestJS + TypeScript | Estrutura modular clara, DI, fácil de crescer |
| ORM | Prisma | Schema declarativo, migrations, tipagem ponta a ponta |
| Banco | SQLite (dev) → Postgres (opcional) | SQLite = zero config pra uso pessoal; troca só muda o `provider` |
| Validação | Zod | Schemas compartilhados entre API e IA |
| Auth | JWT multi-usuário (registro + login) | Grupos/competição exigem vários usuários reais; senha com hash |
| IA | OpenAI SDK (`openai`) | Geração de plano com **structured outputs** (Responses API) |

**Monorepo** com pnpm workspaces (Turborepo é opcional). Um pacote `shared` guarda os schemas Zod e tipos usados pelos dois lados.

---

## 3. Arquitetura

```
┌─────────────────────────┐        HTTP/JSON        ┌──────────────────────────┐
│      Next.js (web)       │  ───────────────────▶   │      NestJS (api)        │
│  App Router · Tailwind   │                         │  Controllers · Services  │
│  TanStack Query          │  ◀───────────────────   │  Guards (JWT)            │
│  RestTimer · SetLogger   │                         │                          │
└─────────────────────────┘                         │        Prisma            │
                                                     └────────┬─────────────────┘
                                                              │
                              ┌───────────────────────────────┼───────────────┐
                              ▼                               ▼                 ▼
                       ┌────────────┐              ┌────────────────┐   ┌──────────────┐
                       │  SQLite /  │              │   OpenAI API   │   │ /uploads     │
                       │  Postgres  │              │  (gera plano)  │   │ (imagens)    │
                       └────────────┘              └────────────────┘   └──────────────┘
```

Regra de ouro: **a chave da OpenAI vive só no backend**. O Next nunca chama a API da OpenAI direto — sempre passa pelo Nest.

---

## 4. Estrutura do monorepo

```
workout-app/
├── package.json                 # workspaces
├── pnpm-workspace.yaml
├── apps/
│   ├── api/                     # NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts          # popula biblioteca de exercícios
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── prisma/          # PrismaService
│   │       ├── auth/
│   │       ├── profile/
│   │       ├── exercises/
│   │       ├── plans/
│   │       ├── sessions/
│   │       ├── progress/
│   │       └── ai/              # geração por IA
│   └── web/                     # Next.js
│       └── src/
│           ├── app/             # rotas
│           ├── components/
│           ├── lib/             # api client, hooks
│           └── styles/
└── packages/
    └── shared/                  # schemas Zod + tipos compartilhados
        └── src/schemas.ts
```

---

## 5. Modelo de dados (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  profile   Profile?
  plans     WorkoutPlan[]
  sessions  WorkoutSession[]
  metrics   BodyMetric[]
}

model Profile {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  birthYear   Int?
  heightCm    Float?
  weightKg    Float?
  goal        String   // FAT_LOSS | HYPERTROPHY | STRENGTH | GENERAL
  experience  String   // BEGINNER | RETURNING | INTERMEDIATE | ADVANCED
  daysPerWeek Int
  sessionMin  Int?
  focusAreas  String?  // JSON: ["UPPER","SHOULDERS"]
  equipment   String?  // JSON: ["BARBELL","DUMBBELL","MACHINE","CABLE"]
  injuries    String?
  updatedAt   DateTime @updatedAt
}

model Exercise {
  id             String  @id @default(cuid())
  slug           String  @unique
  name           String
  muscleGroup    String  // CHEST | BACK | SHOULDERS | ARMS | LEGS | CORE
  category       String  // COMPOUND | ISOLATION
  equipment      String  // BARBELL | DUMBBELL | MACHINE | CABLE | BODYWEIGHT
  imageUrl       String?
  videoUrl       String?
  instructions   String?
  defaultRestSec Int      @default(60)
  planItems      PlanExercise[]
  setLogs        SetLog[]
}

model WorkoutPlan {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  name      String
  source    String   // MANUAL | AI
  notes     String?
  isActive  Boolean  @default(false)
  createdAt DateTime @default(now())
  days      PlanDay[]
}

model PlanDay {
  id        String   @id @default(cuid())
  planId    String
  plan      WorkoutPlan   @relation(fields: [planId], references: [id], onDelete: Cascade)
  name      String        // "Push", "Pull"
  focus     String?
  order     Int
  exercises PlanExercise[]
  sessions  WorkoutSession[]
}

model PlanExercise {
  id         String   @id @default(cuid())
  planDayId  String
  planDay    PlanDay  @relation(fields: [planDayId], references: [id], onDelete: Cascade)
  exerciseId String
  exercise   Exercise @relation(fields: [exerciseId], references: [id])
  order      Int
  sets       Int
  repScheme  String   // "8-12"
  restSec    Int
  notes      String?
}

model WorkoutSession {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  planDayId   String?
  planDay     PlanDay? @relation(fields: [planDayId], references: [id])
  date        DateTime @default(now())
  durationSec Int?
  notes       String?
  setLogs     SetLog[]
}

model SetLog {
  id         String   @id @default(cuid())
  sessionId  String
  session    WorkoutSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  exerciseId String
  exercise   Exercise @relation(fields: [exerciseId], references: [id])
  setNumber  Int
  weightKg   Float?
  reps       Int?
  rpe        Float?
  completed  Boolean  @default(true)
  createdAt  DateTime @default(now())
}

model BodyMetric {
  id       String   @id @default(cuid())
  userId   String
  user     User     @relation(fields: [userId], references: [id])
  date     DateTime @default(now())
  weightKg Float?
  bodyFat  Float?
  notes    String?
}
```

> Para trocar SQLite por Postgres depois: mude `provider` no `datasource` e a `DATABASE_URL`. Os `String` de enum (goal, equipment…) podem virar `enum` nativo do Prisma no Postgres.

---

## 6. API do backend (NestJS)

Todos os endpoints sob `/api`, protegidos por JWT (menos login/seed).

| Módulo | Método & rota | Função |
|--------|---------------|--------|
| auth | `POST /auth/login` | Retorna JWT |
| profile | `GET /profile` · `PUT /profile` | Ler/atualizar perfil |
| exercises | `GET /exercises` · `GET /exercises/:slug` | Biblioteca (com filtros muscleGroup/equipment) |
| plans | `GET /plans` · `POST /plans` · `GET /plans/:id` · `PUT /plans/:id` · `DELETE /plans/:id` | CRUD de planos |
| plans | `PUT /plans/:id/activate` | Marca plano ativo |
| sessions | `POST /sessions` | Inicia sessão (a partir de um planDay) |
| sessions | `POST /sessions/:id/logs` | Registra uma série |
| sessions | `PATCH /sessions/:id/finish` | Fecha a sessão (duração, notas) |
| sessions | `GET /sessions` | Histórico |
| progress | `GET /progress/exercise/:id` | Série histórica pra gráfico (carga/volume) |
| progress | `GET /progress/summary` | Volume semanal, PRs, streak |
| metrics | `POST /metrics` · `GET /metrics` | Peso corporal e medidas |
| ai | `POST /ai/plans/generate` | Gera plano por IA e persiste |

Padrões: DTOs validados com Zod (via `nestjs-zod` ou pipe custom), respostas tipadas, `PrismaService` injetável, tratamento de erro central com filtro de exceções.

---

## 7. Frontend (Next.js)

Rotas (App Router):

| Rota | Tela |
|------|------|
| `/` | Dashboard — treino de hoje, atalho pra iniciar sessão, resumo da semana |
| `/exercises` · `/exercises/[slug]` | Biblioteca e detalhe com imagem/execução |
| `/plans` · `/plans/[id]` · `/plans/new` | Lista, visualização e editor manual de planos |
| `/generate` | Formulário de perfil → gera plano por IA |
| `/workout/[planDayId]` | Sessão ativa: lista de exercícios, SetLogger e RestTimer |
| `/progress` | Gráficos de volume, recordes e peso corporal |
| `/profile` | Editar perfil |
| `/history` | Sessões anteriores |

Componentes-chave: `ExerciseCard`, `PlanEditor`, `SetLogger`, `RestTimer`, `ProgressChart`, `AIPlanForm`, `ProfileForm`. Client de API centralizado em `lib/api.ts`; hooks com TanStack Query em `lib/hooks/`.

---

## 8. Features detalhadas

### 8.1 Biblioteca de exercícios + imagens
- Popular via `seed.ts`. Boa fonte aberta: o dataset **Free Exercise DB** (repo `yuhonas/free-exercise-db`, ~800 exercícios com imagens e licença livre) — importe nome, músculo, equipamento e as imagens. Confira a licença/estado atual do repo antes de usar.
- Guarde as imagens localmente (`apps/api/uploads` servido como estático, ou `apps/web/public/exercises`) e salve o caminho em `Exercise.imageUrl`. Isso evita links quebrados e dependência de terceiros.
- Alternativa/complemento: continuar usando as ilustrações SVG que já temos como fallback quando não houver foto.

### 8.2 Registro de progressão
- Fluxo: iniciar sessão de um `PlanDay` → cada exercício mostra as séries prescritas → registrar carga/reps/RPE por série (`SetLog`).
- UX: pré-preencher a carga da última vez naquele exercício (busca o último `SetLog`) — isso deixa "bater o registro anterior" trivial.
- Detectar **PR** (maior carga ou maior volume) e destacar.

### 8.3 Timer de descanso
- 100% client-side. Use um contador baseado em `Date.now()` (não em `setInterval` puro, que perde precisão em background) ou um Web Worker.
- Descanso padrão vem de `PlanExercise.restSec`. Ao terminar: vibração (`navigator.vibrate`) + notificação (`Notification` API) + som opcional.
- Botões de +15s/-15s e "pular".

### 8.4 Gráficos de progresso
- `/progress`: volume semanal (Σ sets×reps×carga), evolução de carga por exercício, peso corporal ao longo do tempo. Recharts + endpoints de `progress`.

### 8.5 Outras features úteis (nice-to-have)
- **PWA** (instalar no celular, funcionar offline pra consultar o treino).
- **Exportar dados** (CSV/JSON) — importante por ser dados pessoais.
- Notas por sessão e por exercício.
- Deload/semana atual (mostra a fase de readaptação).
- Cronômetro de duração total do treino.

---

## 9. Integração de IA (deep dive)

Objetivo: transformar o **perfil** em um **plano estruturado** que referencia exercícios reais da biblioteca (pra já vir com imagem e execução).

### Como funciona
1. Frontend envia o perfil pra `POST /ai/plans/generate`.
2. O `AiService` busca a **lista de exercícios permitidos** (filtrada pelo equipamento do usuário) e passa os `id`+`name`+`muscleGroup` no prompt. Assim a IA só escolhe exercícios que existem.
3. Chama a OpenAI com **structured outputs** pela **Responses API**, que força a resposta a bater um JSON Schema (via helper de Zod) — sem parsing frágil.
4. Valida com Zod, confere que todo `exerciseId` existe na biblioteca (senão faz retry), e persiste como `WorkoutPlan(source: "AI")`.

### Modelo e custo
- Família atual: **GPT-5.6**. Padrão recomendado pra este app: **`gpt-5.6-terra`** (equilíbrio inteligência/custo). Pra economizar em volume, **`gpt-5.6-luna`**; pra máxima qualidade, o flagship **`gpt-5.6`** (Sol). Gerar um plano é uma chamada pontual, então o custo é baixo de qualquer forma.
- Use a **Responses API** (`openai.responses.parse`) com o helper `zodTextFormat` — é o caminho recomendado hoje. A chave (`OPENAI_API_KEY`) fica só no backend. Trate refusals e truncamento com fallback/retry.
- Docs oficiais: structured outputs em `https://developers.openai.com/api/docs/guides/structured-outputs` e modelos em `https://developers.openai.com/api/docs/models`. Fixe as versões do SDK e confira o formato atual dos parâmetros nesses links.

### Esboço do serviço

```ts
// apps/api/src/ai/ai.service.ts
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Formato exato que a IA deve devolver
const AiPlanSchema = z.object({
  name: z.string(),
  summary: z.string(),
  days: z.array(z.object({
    name: z.string(),                 // "Push"
    focus: z.string(),
    exercises: z.array(z.object({
      exerciseId: z.string(),         // DEVE ser um id da lista enviada
      sets: z.number().int(),
      repScheme: z.string(),          // "8-12"
      restSec: z.number().int(),
      notes: z.string().nullable(),   // structured outputs: use nullable, não optional
    })),
  })),
});
type AiPlan = z.infer<typeof AiPlanSchema>;

const SYSTEM_PROMPT = `
Você é um treinador de força e hipertrofia.
Monte um plano de treino seguro e eficaz seguindo estas regras:
- Respeite os dias/semana, o objetivo e as áreas de foco do perfil.
- Use SOMENTE exercícios da lista fornecida, referenciando pelo id.
- Se o usuário for "RETURNING", aplique readaptação: comece com volume moderado.
- Considere lesões informadas e evite exercícios de risco pra elas.
- Distribua o volume de forma coerente entre os dias.
`;

async function generatePlan(profile, library /* {id,name,muscleGroup,equipment}[] */) {
  const res = await openai.responses.parse({
    model: "gpt-5.6-terra",
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content:
          `PERFIL:\n${JSON.stringify(profile)}\n\n` +
          `EXERCÍCIOS PERMITIDOS:\n${JSON.stringify(library)}`,
      },
    ],
    text: { format: zodTextFormat(AiPlanSchema, "workout_plan") },
  });

  const plan = res.output_parsed;     // já validado contra o schema
  if (!plan) throw new Error("Falha ao gerar plano");

  // Garante que a IA não inventou exercícios
  const valid = new Set(library.map((e) => e.id));
  for (const d of plan.days)
    for (const ex of d.exercises)
      if (!valid.has(ex.exerciseId)) throw new Error("Exercício inválido no plano");

  return plan; // → mapear pra WorkoutPlan/PlanDay/PlanExercise e salvar
}
```

> O helper `zodTextFormat` transforma o schema Zod em JSON Schema estrito. Atenção: nos structured outputs da OpenAI **todos os campos devem ser `required`** — use `.nullable()` no lugar de `.optional()`. Alternativa: a Chat Completions API com `openai.chat.completions.parse` + `zodResponseFormat`. Confira sempre a doc oficial linkada acima.

---

## 10. Fases de implementação (entregar ao Claude Code)

Cada fase deve terminar rodando e testável antes da próxima.

- **Fase 0 — Scaffold.** Monorepo pnpm, `apps/api` (Nest) + `apps/web` (Next) + `packages/shared`. Prisma + SQLite, `PrismaService`, auth JWT **multi-usuário** (registro + login, senha com hash bcrypt/argon2), healthcheck.
- **Fase 1 — Exercícios + Perfil.** Schema, `seed.ts` populando a biblioteca com imagens, módulo `exercises`, telas `/exercises` e `/profile`.
- **Fase 2 — Planos (manual).** CRUD de planos, editor `/plans/new`, visualização `/plans/[id]`, marcar plano ativo.
- **Fase 3 — Sessão + Timer.** `/workout/[planDayId]`, `SetLogger` com pré-preenchimento da última carga, `RestTimer`, fechar sessão.
- **Fase 4 — Progresso.** Endpoints de `progress`, gráficos de volume/carga/peso, detecção de PR, `/history`.
- **Fase 5 — IA.** Módulo `ai`, `POST /ai/plans/generate`, formulário `/generate`, persistência do plano gerado.
- **Fase 6 — Polish.** PWA, exportar dados, `BodyMetric`, notas, deload/semana atual.
- **Fase 7 — Gamificação (streak + XP).** Módulo `game`: streak que respeita descanso, XP/nível ao fechar sessão, conquistas. Widget de streak e barra de XP no dashboard, página `/achievements`. (Ver seção 14.)
- **Fase 8 — Grupos & competição.** Módulo `groups`: criar/entrar por código, membros, leaderboard por período/métrica. Telas `/groups` e `/groups/[id]`. (Ver seção 14.)

---

## 11. Setup & variáveis de ambiente

`apps/api/.env`
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="troque-isto"
OPENAI_API_KEY="sk-..."
PORT=3001
```

`apps/web/.env.local`
```
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

Comandos base:
```
pnpm install
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed
pnpm dev            # roda web + api
```

---

## 12. Boas práticas, segurança e futuro

- Chave da OpenAI **nunca** no cliente; toda chamada de IA passa pelo Nest.
- Valide toda entrada com Zod (inclusive a saída da IA).
- Rate-limit no endpoint de IA (é o que custa dinheiro).
- Backup do banco (é dado pessoal de treino — um `.db` some fácil).
- Futuro fácil de encaixar no schema: múltiplos usuários, importação de planos, integração com wearables, sugestão de progressão automática pela IA lendo o histórico de `SetLog`.

---

## 13. Prompt inicial sugerido pro Claude Code

> "Crie a **Fase 0** deste plano (`plano-implementacao-app.md`): monorepo pnpm com `apps/api` (NestJS + Prisma + SQLite), `apps/web` (Next.js App Router + Tailwind) e `packages/shared` (Zod). Configure `PrismaService`, auth JWT **multi-usuário** (registro + login, senha com hash) e um healthcheck em `/api/health`. Rode e mostre que web e api sobem juntos com `pnpm dev`. Não avance pra Fase 1 ainda."

Depois é só ir pedindo fase por fase, sempre apontando pro documento.

---

## 14. Gamificação & competição (streak, XP, grupos)

Objetivo: transformar o app em algo que dá vontade de abrir todo dia — **sem** incentivar treinar todo dia (isso machuca). Por isso o streak é desenhado pra respeitar descanso.

### 14.1 Streak que respeita descanso
Regras:
- O streak conta em **dias de treino**: cada dia com uma sessão concluída soma +1 (uma vez por dia).
- **Dias de descanso não quebram** o streak. A chama só apaga se você passar da sua "janela de folga" sem treinar.
- Janela derivada da frequência: `maxGapDays = 8 - daysPerWeek` (4×/sem → tolera 4 dias sem treinar; 6× → tolera 2), com mínimo 2 e máximo 4.
- **Streak freeze**: salva o streak de UM lapso. Ganha 1 a cada 7 dias de streak, guarda até 2, e é consumido automaticamente se você estourar a janela.
- Todas as datas no fuso do usuário (`User.timezone`).

Pseudo-lógica (ao fechar sessão, data `D` no fuso do user):
```
se lastTrainedOn == D:        // já contou hoje
  return
gap = diasEntre(lastTrainedOn, D)
se lastTrainedOn == null OU gap <= maxGapDays:
  currentStreak += 1
senão se streakFreezes > 0:
  streakFreezes -= 1; currentStreak += 1     // freeze salvou
senão:
  currentStreak = 1                          // recomeça
longestStreak = max(longestStreak, currentStreak)
lastTrainedOn = D
se currentStreak % 7 == 0: streakFreezes = min(2, streakFreezes + 1)
```
> Importante: na **leitura** (`GET /me/game`), se hoje já passou da janela desde `lastTrainedOn`, zere o streak antes de responder — senão a chama aparece acesa indevidamente. (Ou rode um job diário.)

### 14.2 XP, níveis e conquistas
- **XP por sessão:** base 50 + 5 por série concluída + 25 por PR batido, com multiplicador de streak (+2% por dia, teto +50%).
- **Nível:** limiar crescente, ex.: `level = floor(sqrt(xp / 100)) + 1` — fácil de recalibrar.
- **Conquistas** (catálogo fixo, desbloqueio dá XP bônus): primeiro treino, streaks de 7/30/100, 10/50/100 treinos, primeiro PR, madrugador, "não pulei a semana", etc.

### 14.3 Grupos & competição
- Criar grupo gera um `inviteCode`; outros entram pelo código. Papéis OWNER/MEMBER.
- **Leaderboard** por período (semana atual / mês / geral) e métrica (XP, nº de treinos, volume total, streak atual). Padrão: **XP da semana**.
- O ranking é calculado ao vivo somando o que cada membro fez na janela (sem tabela extra no MVP). Pra temporadas com histórico, dá pra snapshotar depois.
- Notificações leves: "fulano te ultrapassou", "faltam 2 treinos pra liderar".

### 14.4 Adições ao schema (Prisma)
```prisma
// Em User, adicionar:
//   timezone     String  @default("America/Sao_Paulo")
//   game         GameProfile?
//   memberships  GroupMember[]
//   achievements UserAchievement[]
//   ownedGroups  Group[] @relation("GroupOwner")

model GameProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  xp            Int      @default(0)
  level         Int      @default(1)
  currentStreak Int      @default(0)
  longestStreak Int      @default(0)
  streakFreezes Int      @default(0)
  lastTrainedOn String?  // "YYYY-MM-DD" no fuso do user
  updatedAt     DateTime @updatedAt
}

model Achievement {
  id          String @id @default(cuid())
  code        String @unique          // "STREAK_7", "FIRST_PR"
  name        String
  description String
  icon        String
  xpReward    Int    @default(0)
  users       UserAchievement[]
}

model UserAchievement {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  achievementId String
  achievement   Achievement @relation(fields: [achievementId], references: [id])
  unlockedAt    DateTime    @default(now())
  @@unique([userId, achievementId])
}

model Group {
  id          String   @id @default(cuid())
  name        String
  description String?
  inviteCode  String   @unique
  ownerId     String
  owner       User     @relation("GroupOwner", fields: [ownerId], references: [id])
  isPrivate   Boolean  @default(true)
  createdAt   DateTime @default(now())
  members     GroupMember[]
}

model GroupMember {
  id       String   @id @default(cuid())
  groupId  String
  group    Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  userId   String
  user     User     @relation(fields: [userId], references: [id])
  role     String   @default("MEMBER") // OWNER | MEMBER
  joinedAt DateTime @default(now())
  @@unique([groupId, userId])
}
```

### 14.5 Endpoints (adições)

| Módulo | Método & rota | Função |
|--------|---------------|--------|
| game | `GET /me/game` | XP, nível, streak, freezes (expira streak vencida na leitura) |
| game | `GET /me/achievements` | Conquistas desbloqueadas + bloqueadas |
| groups | `POST /groups` | Cria grupo (gera inviteCode) |
| groups | `POST /groups/join` | Entra por `{ code }` |
| groups | `GET /groups` | Grupos do usuário |
| groups | `GET /groups/:id` | Detalhe + membros |
| groups | `GET /groups/:id/leaderboard` | `?period=week&metric=xp` |
| groups | `DELETE /groups/:id/leave` | Sair do grupo |

> XP, streak e conquistas são atualizados no fluxo de **fechar sessão** (`PATCH /sessions/:id/finish`): o `GameService` roda ali e devolve o que mudou (XP ganho, subiu de nível, conquistas novas) pra UI dar o feedback.

### 14.6 Frontend (adições)
- **Dashboard:** widget de streak (chama + número + freezes) e barra de XP/nível.
- **`/achievements`:** grade de conquistas (desbloqueadas coloridas, bloqueadas em cinza).
- **`/groups`** e **`/groups/[id]`:** lista/criar/entrar e leaderboard com seletor de período/métrica, destacando sua posição.
- Micro-animações ao ganhar XP e subir o streak — o feedback gostoso que faz o Duolingo funcionar.

### 14.7 Integridade e privacidade
- XP e ranking vêm de logs auto-reportados. Em grupo de amigos, é na honra — de boa. Se abrir pra desconhecidos, adicione limites (teto de XP/dia, sessões muito curtas não contam, flag de outliers).
- O leaderboard mostra nome/apelido e a métrica agregada — **nunca** os detalhes de treino de outra pessoa.
