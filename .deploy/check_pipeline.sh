#!/bin/bash
echo "=== enrich-real.log ==="
tail -12 /tmp/enrich-real.log 2>&1 || echo "(no log)"
echo ""
echo "=== sync-cast2.log ==="
tail -12 /tmp/sync-cast2.log 2>&1 || echo "(no log)"
echo ""
echo "=== running tsx procs ==="
ps -ef | grep -iE 'tsx|sync-cast|enrich-real' | grep -v grep | head -10 || echo "(none)"
echo ""
echo "=== DB state ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT
  COUNT(*) FILTER (WHERE \"tmdbId\" IS NOT NULL AND \"isActive\" = true) AS with_tmdb,
  COUNT(*) FILTER (WHERE \"tmdbId\" IS NULL AND \"isActive\" = true) AS no_tmdb,
  (SELECT COUNT(*) FROM \"Person\") AS persons,
  (SELECT COUNT(*) FROM \"MoviePerson\") AS movie_person
FROM \"Movie\";"
