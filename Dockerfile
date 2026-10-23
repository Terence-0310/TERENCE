# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY src/dta/prisma ./src/dta/prisma/

# Install deps (postinstall runs prisma generate)
RUN npm ci --legacy-peer-deps

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (NEXT_PUBLIC_* are baked into the client bundle)
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p
ARG NEXT_PUBLIC_REGION=VN
# .env is excluded from the build context (.dockerignore), so the public flags
# it used to provide are passed as build args instead (docker-compose.yml).
ARG NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false
ARG NEXT_PUBLIC_LIVEKIT_URL=

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_TMDB_IMAGE_BASE_URL=$NEXT_PUBLIC_TMDB_IMAGE_BASE_URL
ENV NEXT_PUBLIC_REGION=$NEXT_PUBLIC_REGION
ENV NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=$NEXT_PUBLIC_GOOGLE_AUTH_ENABLED
ENV NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Dummy DATABASE_URL for build — real one comes from docker-compose env
# Prisma needs a valid URL format at build time for type generation
ENV DATABASE_URL="postgresql://postgres:postgres@db:5432/terence_dev?schema=public"

# Generate Prisma client (schema only — no migrate at build time)
RUN npx prisma generate

# Build Next.js
RUN npm run build

# ============================================
# Stage 3: Production runner (minimal image)
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets (logos, images, etc.)
COPY --from=builder /app/public ./public

# Copy standalone build output (produced by output: 'standalone' in next.config)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema + migrations + client
COPY --from=builder --chown=nextjs:nodejs /app/src/dta/prisma ./src/dta/prisma

# We copy the entire node_modules from builder to ensure Prisma CLI, tsx, and seed scripts work perfectly at runtime.
# NextJS App will use .next/standalone/node_modules, but the entrypoint script relies on this.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy source files needed for tsx execution (server.ts + all @/ aliased imports)
COPY --from=builder --chown=nextjs:nodejs /app/src/ ./src/
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/types ./types
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/server.ts ./server.ts

# Entrypoint script — runs migrations (+ optional seed / sync) before starting the app.
# CRs are stripped so a Windows (CRLF) checkout still runs under /bin/sh.
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["./node_modules/.bin/tsx", "server.ts"]
