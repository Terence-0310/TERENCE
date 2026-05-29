#!/bin/bash
set +e

echo "=== 1. DB: John Krasinski có trong Person? ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT id, name, \"originalName\", \"tmdbId\" FROM \"Person\"
WHERE name ILIKE '%krasinski%' OR \"originalName\" ILIKE '%krasinski%';"

echo ""
echo "=== 2. DB: Movies linked to John Krasinski ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT m.title, m.year, mp.role, mp.\"sortOrder\"
FROM \"Movie\" m
JOIN \"MoviePerson\" mp ON mp.\"movieId\" = m.id
JOIN \"Person\" p ON p.id = mp.\"personId\"
WHERE p.name ILIKE '%krasinski%' OR p.\"originalName\" ILIKE '%krasinski%'
ORDER BY m.\"viewCount\" DESC
LIMIT 10;"

echo ""
echo "=== 3. ES: match_phrase actorText 'John Krasinski' ==="
curl -s 'http://localhost:9200/terence_movies/_search?size=5&pretty' \
  -H 'Content-Type: application/json' \
  -d '{"query":{"match_phrase":{"actorText":"John Krasinski"}},"_source":["title","actorText"]}' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'  Total: {d[\"hits\"][\"total\"][\"value\"]}')
for h in d['hits']['hits']:
    s = h['_source']
    print(f'  - {s.get(\"title\", \"?\")[:55]}')
    print(f'    actors=\"{s.get(\"actorText\", \"\")[:200]}\"')
"

echo ""
echo "=== 4. Live API: GET /api/v1/search?q=John+Krasinski (top 5) ==="
curl -sk 'https://terence.com.vn/api/v1/search?q=John+Krasinski&limit=5' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
data = d.get('data', {})
hint = data.get('hint') or {}
print(f'  hint: isLikelyName={hint.get(\"isLikelyName\")} actorMatchCount={hint.get(\"actorMatchCount\")}')
print(f'  total: {data.get(\"pagination\",{}).get(\"total\")}')
for i, m in enumerate(data.get('items', [])[:5]):
    print(f'  {i+1}. [{m.get(\"score\", 0):.0f}]  {m.get(\"title\", \"?\")[:55]}')
"

echo ""
echo "=== 5. ES _explain for Tom Clancy's Jack Ryan score (if exists) ==="
TMDB_ID=$(sudo -u postgres psql -d terence_db -t -A -c "
SELECT id FROM \"Movie\" WHERE title ILIKE '%jack ryan%bóng ma%' OR title ILIKE '%jack ryan%ghost%' LIMIT 1")
if [ -n "$TMDB_ID" ]; then
  echo "  Movie ID: $TMDB_ID"
  curl -s "http://localhost:9200/terence_movies/_doc/$TMDB_ID?_source=title,actorText" \
    | python3 -c "
import sys, json
d = json.load(sys.stdin)
if d.get('found'):
    s = d.get('_source', {})
    print(f'  In ES: {s.get(\"title\")}')
    print(f'  actorText: {s.get(\"actorText\", \"\")[:200]}')
else:
    print('  NOT in ES')
"
fi
