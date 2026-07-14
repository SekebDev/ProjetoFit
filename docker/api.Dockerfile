# Imagem de produção da API (NestJS + Prisma).
# --- estágio de build ---
FROM node:22.19.0-bookworm-slim AS build
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @workout/shared build \
 && pnpm --filter @workout/api prisma:generate \
 && pnpm --filter @workout/api build

# --- estágio de runtime ---
FROM node:22.19.0-bookworm-slim AS runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate
ENV NODE_ENV=production
WORKDIR /app

# Copia a árvore já buildada (inclui node_modules com o Prisma Client gerado,
# preservando os symlinks do workspace pnpm).
COPY --from=build /app ./

WORKDIR /app/apps/api
EXPOSE 3001
# Aplica migrações pendentes e sobe a API.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
