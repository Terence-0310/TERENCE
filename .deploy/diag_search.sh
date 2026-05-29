#!/bin/bash
set +e
echo "=== 1. Direct ES query: match_phrase on actorText 'Jack Reynor' ==="
curl -s 'http://localhost:9200/terence_movies/_search?size=10&pretty' \
  -H 'Content-Type: application/json' \
  -d '{"query":{"match_phrase":{"actorText":"Jack Reynor"}},"_source":["title","originalTitle","actorText","year","slug"]}' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
total = d['hits']['total']['value']
print(f'  Total movies with Jack Reynor as actor (phrase): {total}')
for h in d['hits']['hits']:
    s = h['_source']
    print(f'  - {s.get(\"title\", \"?\")[:50]:50}  ({s.get(\"year\")})  slug={s.get(\"slug\", \"\")}')
    print(f'    actors=\"{s.get(\"actorText\", \"\")[:120]}\"')
"

echo ""
echo "=== 2. App API /api/v1/search?q=Jack+Reynor ==="
curl -sk 'https://terence.com.vn/api/v1/search?q=Jack+Reynor&limit=10' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
items = d.get('data', {}).get('items', [])
print(f'  Source: {d.get(\"data\", {}).get(\"source\")}')
print(f'  Total: {d.get(\"data\", {}).get(\"total\", 0)}')
for i, m in enumerate(items[:10]):
    print(f'  {i+1:2}. [{m.get(\"score\", 0):.1f}]  {m.get(\"title\", \"?\")[:55]:55}  ({m.get(\"year\")})')
"

echo ""
echo "=== 3. Any actor record containing 'Reynor' (substring match) ==="
curl -s 'http://localhost:9200/terence_movies/_search?size=5&pretty' \
  -H 'Content-Type: application/json' \
  -d '{"query":{"match":{"actorText":"Reynor"}},"_source":["title","actorText","year"]}' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
total = d['hits']['total']['value']
print(f'  Total movies mentioning \"Reynor\" in actorText: {total}')
for h in d['hits']['hits']:
    s = h['_source']
    print(f'  - {s.get(\"title\", \"?\")[:50]:50}  ({s.get(\"year\")})')
    print(f'    actors=\"{s.get(\"actorText\", \"\")[:120]}\"')
"
