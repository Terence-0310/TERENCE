#!/usr/bin/env bash
# ============================================
# TERENCE — roll the app back to an earlier image
# ============================================
# Usage: deploy/oracle/rollback.sh            # to .deploy-state/previous_tag
#        deploy/oracle/rollback.sh <git-sha>  # to a specific terence-app:<tag>
#        deploy/oracle/rollback.sh --list     # show available images
#
# Only swaps the app container image; data volumes are untouched. Migrations
# in this repo are additive, so older code normally runs on the newer schema.
# If a database restore is really needed, follow README_DEPLOY_ORACLE.md
# §Rollback (manual, takes a fresh backup first) — never done automatically.

# shellcheck source=lib.sh
. "$(dirname "$0")/lib.sh"

if [ "${1:-}" = "--list" ]; then
  docker image ls terence-app --format 'table {{.Tag}}\t{{.CreatedSince}}\t{{.Size}}'
  echo "current:  $(cat "$STATE_DIR/current_tag" 2>/dev/null || echo '-')"
  echo "previous: $(cat "$STATE_DIR/previous_tag" 2>/dev/null || echo '-')"
  exit 0
fi

TARGET="${1:-$(cat "$STATE_DIR/previous_tag" 2>/dev/null || true)}"
[ -n "$TARGET" ] || die "No previous tag recorded — pass one explicitly (see --list)"
docker image inspect "terence-app:$TARGET" >/dev/null 2>&1 || die "Image terence-app:$TARGET not found locally (see --list)"

CURRENT="$(cat "$STATE_DIR/current_tag" 2>/dev/null || true)"
echo "Rolling app back: ${CURRENT:-unknown} → $TARGET"
APP_IMAGE_TAG="$TARGET" dc up -d --no-build --no-deps app

if wait_app_healthy 300; then
  echo "$TARGET" > "$STATE_DIR/current_tag"
  [ -n "$CURRENT" ] && echo "$CURRENT" > "$STATE_DIR/previous_tag"
  ok "terence-app:$TARGET is healthy"
else
  dc logs --tail=60 app || true
  die "terence-app:$TARGET did not become healthy"
fi
