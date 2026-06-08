# syntax=docker/dockerfile:1

# ---------- Builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (including dev) for the build
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Generate Prisma client + compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build

# ---------- Runner ----------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Bring in the compiled output, generated Prisma client, and migrations
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Volume mount target for the SQLite file. The host should mount a persistent
# disk here (e.g. Fly.io volume, Railway volume) and set
# DATABASE_URL="file:/data/prod.db". The volume itself is declared in the host
# config (fly.toml or Railway UI) — we do not emit a Dockerfile VOLUME because
# Railway rejects that directive.
RUN mkdir -p /data

EXPOSE 5000

# Apply pending migrations on every boot, then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
