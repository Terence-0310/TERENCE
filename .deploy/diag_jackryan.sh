#!/bin/bash
set +e

echo "=== Jack Ryan Ghost War — DB row ==="
sudo -u postgres psql -d terence_db -c "
SELECT id, title, \"originalTitle\", \"contentType\", \"tmdbId\", \"isActive\", \"deletedAt\"
FROM \"Movie\"
WHERE title ILIKE '%jack ryan%' OR \"originalTitle\" ILIKE '%jack ryan%'
LIMIT 5;"

echo ""
echo "=== Movie 1380291 (from URL) — direct lookup ==="
sudo -u postgres psql -d terence_db -c "
SELECT id, title, \"contentType\", \"tmdbId\" FROM \"Movie\" WHERE \"tmdbId\" = 1380291;"

echo ""
echo "=== Total movies with tmdbId vs without ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT
  COUNT(*) FILTER (WHERE \"tmdbId\" IS NOT NULL AND \"isActive\" = true) AS with_tmdb_active,
  COUNT(*) FILTER (WHERE \"tmdbId\" IS NULL AND \"isActive\" = true) AS no_tmdb_active,
  COUNT(*) FILTER (WHERE \"isActive\" = true) AS total_active
FROM \"Movie\";"

echo ""
echo "=== Movies WITH tmdbId but NO MoviePerson rows (missed by sync) ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT COUNT(*) FROM \"Movie\" m
WHERE m.\"tmdbId\" IS NOT NULL
  AND m.\"isActive\" = true
  AND m.\"deletedAt\" IS NULL
  AND NOT EXISTS (SELECT 1 FROM \"MoviePerson\" mp WHERE mp.\"movieId\" = m.id);"
