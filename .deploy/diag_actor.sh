#!/bin/bash
set +e
echo "=== 1. DB: Person record cho 'Ngô Kinh' ==="
sudo -u postgres psql -d terence_db -t -c "SELECT id, name FROM \"Person\" WHERE name ILIKE '%ngô kinh%' OR name ILIKE '%ngo kinh%' LIMIT 5;"

echo ""
echo "=== 2. DB: Movies với Person 'Ngô Kinh' qua MoviePerson ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT m.id, m.title, m.slug, mp.role
FROM \"Movie\" m
JOIN \"MoviePerson\" mp ON mp.\"movieId\" = m.id
JOIN \"Person\" p ON p.id = mp.\"personId\"
WHERE p.name ILIKE '%ngô kinh%' OR p.name = 'Ngô Kinh'
LIMIT 10;"

echo ""
echo "=== 3. ES: match_phrase actorText 'Ngô Kinh' ==="
curl -s 'http://localhost:9200/terence_movies/_search?size=5&pretty' \
  -H 'Content-Type: application/json' \
  -d '{"query":{"match_phrase":{"actorText":"Ngô Kinh"}},"_source":["title","actorText","year"]}' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'  match_phrase actorText Total: {d[\"hits\"][\"total\"][\"value\"]}')
for h in d['hits']['hits']:
    s = h['_source']
    print(f'  - {s.get(\"title\", \"?\")[:50]:50} ({s.get(\"year\")})')
    print(f'    actors=\"{s.get(\"actorText\", \"\")[:200]}\"')
"

echo ""
echo "=== 4. ES: match_phrase actorTextAscii 'ngo kinh' ==="
curl -s 'http://localhost:9200/terence_movies/_search?size=5&pretty' \
  -H 'Content-Type: application/json' \
  -d '{"query":{"match_phrase":{"actorTextAscii":"ngo kinh"}},"_source":["title","actorTextAscii"]}' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'  match_phrase actorTextAscii Total: {d[\"hits\"][\"total\"][\"value\"]}')
for h in d['hits']['hits'][:5]:
    s = h['_source']
    print(f'  - {s.get(\"title\", \"?\")[:50]:50}')
    print(f'    asciiAct=\"{s.get(\"actorTextAscii\", \"\")[:200]}\"')
"

echo ""
echo "=== 5. App API /api/v1/search?q=Ngô+Kinh ==="
curl -sk 'https://terence.com.vn/api/v1/search?q=Ng%C3%B4+Kinh&limit=10' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
data = d.get('data', {})
hint = data.get('hint') or {}
print(f'  hint: isLikelyName={hint.get(\"isLikelyName\")} actorMatchCount={hint.get(\"actorMatchCount\")}')
print(f'  total: {data.get(\"pagination\",{}).get(\"total\")}')
for i, m in enumerate(data.get('items', [])[:5]):
    print(f'  {i+1}. [{m.get(\"score\", 0):.1f}]  {m.get(\"title\", \"?\")[:55]}')
"
