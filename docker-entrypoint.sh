#!/bin/sh
# ============================================
# Docker Entrypoint â€” TERENCE
# ============================================
# Runs Prisma migrations + optional seed before starting the app.
# This ensures the DB schema is always up-to-date on container start.

set -e

echo "================================================"
echo "  TERENCE â€” Docker Entrypoint"
echo "================================================"

# Wait for PostgreSQL to be ready
echo "â³ Waiting for database..."
MAX_RETRIES=30
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  if node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.\$connect().then(() => { p.\$disconnect(); process.exit(0); }).catch(() => process.exit(1));
  " > /dev/null 2>&1; then
    echo "âœ… Database connected!"
    break
  fi
  RETRY=$((RETRY + 1))
  echo "   Attempt $RETRY/$MAX_RETRIES â€” retrying in 2s..."
  sleep 2
done

if [ $RETRY -ge $MAX_RETRIES ]; then
  echo "âš ï¸  Database not available after $MAX_RETRIES attempts."
  echo "   Starting app anyway (some features may not work)..."
else
  # Run migrations
  echo ""
  echo "ðŸ”„ Running Prisma migrations..."
  ./node_modules/.bin/prisma migrate deploy 2>&1 || echo "âš ï¸  Migration warning (may already be applied)"

  # Seed if SEED_ON_START=true
  if [ "${SEED_ON_START:-false}" = "true" ]; then
    echo ""
    echo "ðŸŒ± Seeding database..."
    ./node_modules/.bin/prisma db seed 2>&1 || echo "âš ï¸  Seed warning (may already have data)"
  fi
fi

echo ""
echo "ðŸš€ Starting TERENCE (production)..."
echo "   http://localhost:${PORT:-3000}"
echo "================================================"
exec "$@"
