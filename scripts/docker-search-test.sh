#!/bin/sh
# ============================================
# Docker Search Smoke Test
# ============================================
# Wait for the app + ES to be healthy, then probe /api/v1/search with a
# representative set of Vietnamese queries. Prints top-3 hits + suggestions
# for each. Exits non-zero if any query gets HTTP != 200.
#
# Usage:
#   sh scripts/docker-search-test.sh
#   BASE=http://localhost:3000 sh scripts/docker-search-test.sh

set -e

BASE="${BASE:-http://localhost:3000}"
ES="${ES:-http://localhost:9200}"
INDEX="${ELASTICSEARCH_INDEX_MOVIES:-terence_movies}"

echo "════════════════════════════════════════════"
echo "  TERENCE — Docker Search Smoke Test"
echo "════════════════════════════════════════════"
echo "  App:   $BASE"
echo "  ES:    $ES"
echo "  Index: $INDEX"
echo ""

# 1) Wait for ES.
echo "[1/3] Waiting for Elasticsearch..."
RETRY=0
until curl -sf "$ES/_cluster/health?wait_for_status=yellow&timeout=2s" >/dev/null 2>&1; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -gt 60 ]; then
    echo "  ✗ ES not reachable after 2 minutes." >&2
    exit 1
  fi
  sleep 2
done
echo "  ✓ ES is healthy"

# 2) Wait for app.
echo "[2/3] Waiting for app..."
RETRY=0
until curl -sf "$BASE/api/health" >/dev/null 2>&1; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -gt 90 ]; then
    echo "  ✗ App not reachable after 3 minutes." >&2
    exit 1
  fi
  sleep 2
done
echo "  ✓ App is healthy"

# 3) Verify the index has documents. The Docker entrypoint runs the indexer
#    automatically on first boot via SEED_ON_START / SYNC_OPHIM_ON_START.
DOC_COUNT=$(curl -s "$ES/$INDEX/_count" | sed -n 's/.*"count":\([0-9]*\).*/\1/p')
DOC_COUNT="${DOC_COUNT:-0}"
echo "[3/3] Index doc count: $DOC_COUNT"
if [ "$DOC_COUNT" -eq 0 ]; then
  echo "  ⚠  Index is empty. Run \`docker compose exec app npm run search:reindex\` to populate."
fi
echo ""

# Run a small battery of queries.
echo "════════════════════════════════════════════"
echo "  Probing /api/v1/search ..."
echo "════════════════════════════════════════════"

FAIL=0
for Q in \
  "tu chien tren khong" \
  "Tử Chiến Trên Không" \
  "spider man" \
  "spider-man" \
  "avengers" \
  "hanh dong" \
  "hành động" \
  "han quoc" \
  "marvel" \
  "luật sư"
do
  ENCODED=$(printf '%s' "$Q" | jq -sRr @uri 2>/dev/null || node -e "console.log(encodeURIComponent(process.argv[1]))" "$Q")
  URL="$BASE/api/v1/search?q=$ENCODED&limit=3"
  RESP_FILE=$(mktemp)
  CODE=$(curl -s -o "$RESP_FILE" -w "%{http_code}" "$URL")

  if [ "$CODE" != "200" ]; then
    echo "✗ \"$Q\" → HTTP $CODE"
    FAIL=$((FAIL + 1))
    cat "$RESP_FILE" | head -c 200
    echo ""
    rm -f "$RESP_FILE"
    continue
  fi

  # Inline node parser tolerates both legacy (data: []) and new (data: {items})
  # response shapes so this script works during/after the rollout.
  SUMMARY=$(node -e '
    const fs = require("fs");
    const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const isNew = body && body.data && !Array.isArray(body.data);
    const items = isNew ? (body.data.items || []) : (Array.isArray(body.data) ? body.data : []);
    const total = (isNew ? body.data.pagination : body.pagination)?.total ?? items.length;
    const src = body.meta?.source ?? "?";
    console.log(JSON.stringify({
      total, src,
      top: items.slice(0, 3).map((i) => ({ score: i.score, title: i.title, year: i.year })),
    }));
  ' "$RESP_FILE")
  rm -f "$RESP_FILE"

  echo "═══ Q: \"$Q\" → $SUMMARY"
done

echo ""
if [ "$FAIL" -gt 0 ]; then
  echo "✗ $FAIL query(ies) failed."
  exit 1
fi
echo "✓ All queries returned 200."
