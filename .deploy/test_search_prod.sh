#!/bin/bash
set +e
HOST="https://terence.com.vn"
for q in "naruto" "one piece" "spider" "nguoi nhen" "harry poter" "kinh dị"; do
  encoded=$(printf '%s' "$q" | jq -rR @uri)
  echo ""
  echo "=== Query: '$q' ==="
  echo "--- /api/v1/search ---"
  curl -sk "$HOST/api/v1/search?q=$encoded&limit=5" \
    | jq -r '.data.items[]? | "  [\(.score|tostring|.[:7])]  \(.title) / \(.originalTitle // "—")"' \
    | head -5
  echo "--- /api/v1/search/suggest ---"
  curl -sk "$HOST/api/v1/search/suggest?q=$encoded&limit=5" \
    | jq -r '.data[]? | "  - \(.title) / \(.originalTitle // "—")"' \
    | head -5
done

echo ""
echo "=== Source verification (should be 'elasticsearch' now) ==="
curl -sk "$HOST/api/v1/search?q=one+piece&limit=1" | jq -r '.data.source'
echo ""
echo "=== /api/health ==="
curl -sk "$HOST/api/health"
