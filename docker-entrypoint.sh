#!/bin/sh
# ============================================
# Docker Entrypoint — TERENCE
# ============================================
# Runs Prisma migrations + optional seed/OPhim sync + Elasticsearch reindex
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
  echo "Syncing database schema (prisma db push)..."
  ./node_modules/.bin/prisma db push --schema=src/dta/prisma/schema.prisma --accept-data-loss 2>&1 || echo "WARN: schema sync issue"

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

  # If we just seeded/sync'd, push the data into Elasticsearch so the new
  # mapping (and tier-based ranking) is populated immediately. This is the
  # bridge between DB state and search readiness.
  if [ "${SEED_ON_START:-false}" = "true" ] || [ "${SYNC_OPHIM_ON_START:-false}" = "true" ]; then
    echo ""
    echo "Reindexing Elasticsearch..."
    ./node_modules/.bin/tsx src/dta/scripts/elastic-reindex.ts 2>&1 || echo "WARN: ES reindex failed (app keeps running on Prisma fallback)"
  fi
fi

echo ""
echo "Starting TERENCE on port ${PORT:-3000}..."
echo "================================================"
exec "$@"
