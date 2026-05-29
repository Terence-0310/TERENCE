#!/bin/bash
set +e
cd /var/www/TERENCE
# Strip ?schema=... query string for psql
RAW=$(grep '^DATABASE_URL=' .env | head -1 | sed -E 's/^DATABASE_URL="?//;s/"?$//')
DB_URL=${RAW%%\?*}
echo "=== Tables in prod DB (count) ==="
sudo -u postgres psql "$DB_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>&1
echo ""
echo "=== Tables list ==="
sudo -u postgres psql "$DB_URL" -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" 2>&1
