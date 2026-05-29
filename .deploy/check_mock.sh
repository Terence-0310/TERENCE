#!/bin/bash
echo "=== Mock movie counts ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT
  COUNT(*) FILTER (WHERE title ILIKE 'Phim Điện Ảnh Mock%' OR title ILIKE 'Movie Mock%') AS mock_titles,
  COUNT(*) FILTER (WHERE title ILIKE 'Phim Điện Ảnh Mock%' OR title ILIKE 'Movie Mock%')
    + COUNT(*) FILTER (WHERE \"tmdbId\" IS NULL AND \"isActive\" = true) AS would_enrich,
  COUNT(*) FILTER (WHERE \"tmdbId\" IS NULL AND \"isActive\" = true
                    AND title NOT ILIKE 'Phim Điện Ảnh Mock%'
                    AND title NOT ILIKE 'Movie Mock%') AS real_missing_tmdb
FROM \"Movie\";"

echo ""
echo "=== Sample non-mock movies missing tmdbId ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT title FROM \"Movie\"
WHERE \"tmdbId\" IS NULL
  AND \"isActive\" = true
  AND title NOT ILIKE 'Phim Điện Ảnh Mock%'
  AND title NOT ILIKE 'Movie Mock%'
ORDER BY \"viewCount\" DESC
LIMIT 10;"

echo ""
echo "=== Current state ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT
  COUNT(*) AS persons FROM \"Person\";
SELECT COUNT(*) AS movie_person_links FROM \"MoviePerson\";
SELECT COUNT(DISTINCT \"movieId\") FROM \"MoviePerson\";"
