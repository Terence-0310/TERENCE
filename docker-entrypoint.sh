#!/bin/sh
# ============================================
# Docker Entrypoint — TERENCE
# ============================================
# Runs Prisma migrations (migrate deploy) + optional seed/OPhim sync + Elasticsearch reindex
# before starting the app. This ensures the DB schema and the search index
# are always in sync with the running container.
#
# Note: Dockerfile generates a near-identical inline entrypoint at build
# time (see Dockerfile lines 86-127). This standalone file mirrors that
# logic and is the single source of truth for `docker compose run` users
# or manual debugging on the host.

set -e

echo "================================================"
echo "  TERENCE — Docker Entrypoint"
echo "================================================"

# Wait for PostgreSQL to be ready
echo "Waiting for database..."
MAX_RETRIES=30
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  if node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.\$connect().then(() => { p.\$disconnect(); process.exit(0); }).catch(() => process.exit(1));
  " > /dev/null 2>&1; then
    echo "Database connected!"
    break
  fi
  RETRY=$((RETRY + 1))
  echo "  Attempt $RETRY/$MAX_RETRIES — retrying in 2s..."
  sleep 2
done

if [ $RETRY -ge $MAX_RETRIES ]; then
  echo "WARN: Database not available after $MAX_RETRIES attempts."
  echo "      Starting app anyway (some features will not work)."
else
  echo ""
  echo "Applying database migrations (prisma migrate deploy)..."
  SCHEMA=src/dta/prisma/schema.prisma
  OUT=$(./node_modules/.bin/prisma migrate deploy --schema=$SCHEMA 2>&1) && echo "$OUT" || {
    echo "$OUT"
    # P3005 = database already has tables but no migration history (it was
    # created with `db push`). Mark the baseline as applied once, then retry.
    if echo "$OUT" | grep -q "P3005"; then
      echo "Existing database without migration history — baselining..."
      ./node_modules/.bin/prisma migrate resolve --schema=$SCHEMA --applied 20261006000000_baseline 2>&1 \
        && ./node_modules/.bin/prisma migrate deploy --schema=$SCHEMA 2>&1 \
        || echo "WARN: baselining failed — check the database schema"
    else
      echo "WARN: prisma migrate deploy failed"
    fi
  }

  if [ "${SEED_ON_START:-false}" = "true" ]; then
    echo ""
    echo "Seeding database..."
    ./node_modules/.bin/prisma db seed 2>&1 || echo "WARN: seed warning (may already have data)"
  fi

  if [ "${SYNC_OPHIM_ON_START:-false}" = "true" ]; then
    PAGES="${OPHIM_SYNC_PAGES:-3}"
    echo ""
    echo "Syncing OPhim catalog (pages 1-${PAGES})..."
    ./node_modules/.bin/tsx src/dta/scripts/sync-ophim-catalog.ts --pages=${PAGES} 2>&1 || echo "WARN: OPhim sync issue (continuing)"
  fi

  if [ "${SYNC_KKPHIM_ON_START:-false}" = "true" ]; then
    PAGES="${KKPHIM_SYNC_PAGES:-3}"
    echo ""
    echo "Syncing KKPhim catalog (pages 1-${PAGES})..."
    ./node_modules/.bin/tsx src/dta/scripts/sync-kkphim-catalog.ts --pages=${PAGES} --delay=750 2>&1 || echo "WARN: KKPhim sync issue (continuing)"
  fi

  # If we just seeded/sync'd, push the data into Elasticsearch so the new
  # mapping (and tier-based ranking) is populated immediately. This is the
  # bridge between DB state and search readiness.
  if [ "${SEED_ON_START:-false}" = "true" ] || [ "${SYNC_OPHIM_ON_START:-false}" = "true" ] || [ "${SYNC_KKPHIM_ON_START:-false}" = "true" ]; then
    echo ""
    echo "Reindexing Elasticsearch..."
    ./node_modules/.bin/tsx src/dta/scripts/elastic-reindex.ts 2>&1 || echo "WARN: ES reindex failed (app keeps running on Prisma fallback)"
  fi
fi

echo ""
echo "Starting TERENCE on port ${PORT:-3000}..."
echo "================================================"
exec "$@"
