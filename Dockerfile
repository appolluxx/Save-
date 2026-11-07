# =============================================================================
# SaveRaks Production Multi-Stage Dockerfile for Railway & Cloud Deployment
# =============================================================================

# Use Node 24 (LTS/current with built-in node:sqlite required by pnpm 11)
FROM node:24-bookworm-slim AS base
WORKDIR /app

# Install system dependencies needed for Prisma engines & OpenSSL
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install pnpm matching package.json version
RUN npm install -g pnpm@11.25.0

# ---- Dependencies Stage ----
FROM base AS dependencies
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
COPY apps/web/package.json ./apps/web/
COPY tests/ ./tests/

RUN pnpm install --frozen-lockfile

# ---- Build Stage ----
FROM dependencies AS builder
WORKDIR /app

COPY . .

# Build all packages & apps:
# 1. packages/shared
# 2. apps/web (Vite production build into apps/web/dist)
# 3. apps/api (Prisma Client generation)
RUN pnpm -r build

# ---- Production Runner Stage ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy node_modules, built dist, and sources
COPY --from=builder /app /app

EXPOSE 4000

# Entrypoint: runs prisma migrations on DB, then boots Express server
CMD ["sh", "-c", "cd apps/api && (npx prisma migrate deploy || echo '⚠️ Database migration skipped or pending connection') && cd ../.. && node apps/api/src/server.js"]
