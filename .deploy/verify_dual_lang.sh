#!/bin/bash
set +e

echo "=== DB: dual-language Person samples (English alias filled) ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT name, \"originalName\" FROM \"Person\"
WHERE \"originalName\" IS NOT NULL
  AND name != \"originalName\"
  AND name ~ '[가-힣一-龥À-ỹ]'
LIMIT 8;"

echo ""
echo "=== Persons named 'Wu Jing' or similar Chinese stars (after dual-lang sync) ==="
sudo -u postgres psql -d terence_db -t -c "
SELECT name, \"originalName\" FROM \"Person\"
WHERE \"originalName\" ILIKE '%wu jing%'
   OR \"originalName\" ILIKE '%donnie yen%'
   OR \"originalName\" ILIKE '%jackie chan%'
   OR \"originalName\" ILIKE '%jet li%'
LIMIT 10;"

echo ""

test_query() {
  local q="$1"
  local encoded=$(printf '%s' "$q" | jq -rR @uri)
  echo "=== '$q' ==="
  curl -sk "https://terence.com.vn/api/v1/search?q=$encoded&limit=4" | python3 -c "
import sys, json
d = json.load(sys.stdin)
data = d.get('data', {})
hint = data.get('hint') or {}
print(f'  hint: isLikelyName={hint.get(\"isLikelyName\")} actorMatchCount={hint.get(\"actorMatchCount\")} total={data.get(\"pagination\",{}).get(\"total\")}')
for i, m in enumerate(data.get('items', [])[:4]):
    print(f'  {i+1}. [{m.get(\"score\", 0):.0f}]  {m.get(\"title\", \"?\")[:55]}')
"
  echo ""
}

test_query "Wu Jing"
test_query "Donnie Yen"
test_query "Jackie Chan"
test_query "John Krasinski"
test_query "Trái Ác Quỳ"
