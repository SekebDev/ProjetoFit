# Imagem de desenvolvimento compartilhada por api e web (hot-reload via bind mount).
FROM node:22.19.0-bookworm-slim

# openssl/ca-certificates são exigidos pela engine do Prisma.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

WORKDIR /app

# Instala deps primeiro (camada cacheável). Só os manifestos entram aqui.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# Copia o restante do código. Em runtime os bind mounts sobrepõem o código,
# mas isto serve para semear os volumes de node_modules e rodar o prisma generate.
COPY . .
RUN pnpm --filter @workout/api prisma:generate

EXPOSE 3000 3001
