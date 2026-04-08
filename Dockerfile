# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20-alpine AS deps
WORKDIR /app

# Required for Prisma + bcrypt Alpine builds
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install deps (postinstall runs prisma generate)
RUN npm ci

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

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_TMDB_IMAGE_BASE_URL=$NEXT_PUBLIC_TMDB_IMAGE_BASE_URL
ENV NEXT_PUBLIC_REGION=$NEXT_PUBLIC_REGION
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

# Copy Prisma schema + migrations + client (needed for runtime queries + migrate deploy)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
# Prisma CLI binary needed for `prisma migrate deploy` at runtime
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
# tsx + seed dependencies (for `prisma db seed`)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Copy package.json (prisma reads seed config from here)
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Entrypoint script — runs migrations before starting app
# Created inline to avoid Windows CRLF line-ending issues
RUN printf '#!/bin/sh\n\
set -e\n\
echo "================================================"\n\
echo "  TERENCE — Docker Entrypoint"\n\
echo "================================================"\n\
echo "Waiting for database..."\n\
MAX_RETRIES=30\n\
RETRY=0\n\
while [ $RETRY -lt $MAX_RETRIES ]; do\n\
  if node -e "\n\
    const{PrismaClient}=require('"'"'@prisma/client'"'"');\n\
    const p=new PrismaClient();\n\
    p.\\$connect().then(()=>{p.\\$disconnect();process.exit(0)}).catch(()=>process.exit(1));\n\
  " > /dev/null 2>&1; then\n\
    echo "DB connected!"\n\
    break\n\
  fi\n\
  RETRY=$((RETRY+1))\n\
  echo "  Attempt $RETRY/$MAX_RETRIES..."\n\
  sleep 2\n\
done\n\
if [ $RETRY -ge $MAX_RETRIES ]; then\n\
  echo "DB not available, starting anyway..."\n\
else\n\
  echo "Running migrations..."\n\
  ./node_modules/.bin/prisma migrate deploy 2>&1 || echo "Migration warning"\n\
  if [ "${SEED_ON_START:-false}" = "true" ]; then\n\
    echo "Seeding database..."\n\
    ./node_modules/.bin/prisma db seed 2>&1 || echo "Seed warning"\n\
  fi\n\
fi\n\
echo "Starting TERENCE on port ${PORT:-3000}..."\n\
exec "$@"\n' > ./docker-entrypoint.sh && \
    chmod +x ./docker-entrypoint.sh && \
    chown nextjs:nodejs ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]

