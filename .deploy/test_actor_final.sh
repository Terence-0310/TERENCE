#!/bin/bash
set +e

# Count actors in DB now
echo "=== DB state after cast sync ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT COUNT(*) AS persons FROM \"Person\";
SELECT COUNT(*) AS movie_person_links FROM \"MoviePerson\";
SELECT COUNT(DISTINCT \"movieId\") AS movies_with_cast FROM \"MoviePerson\";"

echo ""
echo "=== Sample of well-known actors in DB ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT name FROM \"Person\"
WHERE name IN ('Tom Holland', 'Tom Hanks', 'Tom Cruise', 'Robert Downey Jr.', 'Scarlett Johansson', 'Wu Jing', 'Donnie Yen', 'Jet Li', 'Jackie Chan', 'IU', 'Karl Urban')
LIMIT 20;"

echo ""
test_query() {
  local q="$1"
  local encoded=$(printf '%s' "$q" | jq -rR @uri)
  echo "=== '$q' ==="
  curl -sk "https://terence.com.vn/api/v1/search?q=$encoded&limit=5" | python3 -c "
import sys, json
d = json.load(sys.stdin)
data = d.get('data', {})
hint = data.get('hint') or {}
print(f'  hint: isLikelyName={hint.get(\"isLikelyName\")} actorMatchCount={hint.get(\"actorMatchCount\")}  total={data.get(\"pagination\",{}).get(\"total\")}')
for i, m in enumerate(data.get('items', [])[:5]):
    title = m.get('title', '?')
    print(f'  {i+1}. [{m.get(\"score\", 0):.0f}]  {title[:60]}')
"
  echo ""
}

test_query "Tom Holland"
test_query "Trái Ác Quỳ"
test_query "Jackie Chan"
test_query "IU"
test_query "Ngô Kinh"
test_query "Donnie Yen"
