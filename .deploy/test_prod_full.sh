#!/bin/bash
set +e
HOST="https://terence.com.vn"

test_query() {
  local q="$1" label="$2"
  local encoded=$(printf '%s' "$q" | jq -rR @uri)
  echo ""
  echo "=== $label : '$q' ==="
  curl -sk "$HOST/api/v1/search?q=$encoded&limit=3" | python3 -c "
import sys, json
d = json.load(sys.stdin)
data = d.get('data', {})
hint = data.get('hint') or {}
pag = data.get('pagination', {})
print(f'  hint: isLikelyName={hint.get(\"isLikelyName\")} actorMatchCount={hint.get(\"actorMatchCount\")}  total={pag.get(\"total\")}')
for i, m in enumerate(data.get('items', [])[:3]):
    print(f'    {i+1}. [{m.get(\"score\", 0):.1f}]  {m.get(\"title\", \"?\")[:50]}')
"
}

test_query 'Jack Reynor'   'name not in DB (banner expected)'
test_query 'kinh dị'       'genre word (no banner)'
test_query 'one piece'     'lowercase 2-word title (no banner)'
test_query 'Tom Holland'   'capitalised name (banner)'

echo ""
echo "=== ES mapping new fields on prod ==="
curl -s 'http://localhost:9200/terence_movies/_mapping' \
  | python3 -c "
import sys, json
m = json.load(sys.stdin)
props = m.get('terence_movies', {}).get('mappings', {}).get('properties', {})
for f in ['reviewText', 'reviewTextAscii', 'subtitleText', 'subtitleTextAscii']:
    print(f'  {\"✓\" if f in props else \"✗\"}  {f}')
"

echo ""
echo "=== /browse?q=Jack+Reynor HTML check (look for banner) ==="
curl -sk "$HOST/browse?q=Jack+Reynor" \
  | grep -oE 'Không tìm thấy phim của diễn viên[^<]{0,80}' \
  | head -1 \
  || echo '  (banner string not found in HTML)'
