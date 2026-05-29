#!/bin/bash
set +e
echo "=== Persons containing 'Wu Jing' or '吳京' ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT id, name FROM \"Person\"
WHERE name ILIKE '%wu jing%'
   OR name = '吳京'
   OR name ILIKE '%donnie%'
LIMIT 10;"

echo ""
echo "=== Movie 39751 (Hầu Tửu Quyền) — what's in our MoviePerson? ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT mp.role, p.name FROM \"MoviePerson\" mp
JOIN \"Person\" p ON p.id = mp.\"personId\"
WHERE mp.\"movieId\" = (SELECT id FROM \"Movie\" WHERE slug LIKE '%hau-tuu-quyen%' OR slug LIKE '%39751%' LIMIT 1)
LIMIT 20;"

echo ""
echo "=== Count: How many Movies have any MoviePerson record? ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT COUNT(DISTINCT \"movieId\") AS movies_with_cast,
       (SELECT COUNT(*) FROM \"Movie\" WHERE \"isActive\" = true AND \"deletedAt\" IS NULL) AS total_active_movies
FROM \"MoviePerson\";"

echo ""
echo "=== Count: how many Person rows total in DB? ==="
sudo -u postgres psql -d terence_db -t -c "SELECT COUNT(*) FROM \"Person\";"
