#!/usr/bin/env bash
# ============================================
# TERENCE — build + deploy (docker-compose.prod.yml)
# ============================================
# Usage: deploy/oracle/deploy.sh [--skip-pull] [--skip-backup]
#
# Steps: check env → git pull (fast-forward only) → build image tagged with the
# git commit → backup PostgreSQL → show + apply pending Prisma migrations
# (`migrate deploy` only: never reset, never auto-baseline) → start stack →
# wait for health → on failure switch the app back to the previous image.
# Database changes are NOT reverted automatically (see rollback.sh / README).

# shellcheck source=lib.sh
. "$(dirname "$0")/lib.sh"

SKIP_PULL=false; SKIP_BACKUP=false
for arg in "$@"; do
  case "$arg" in
    --skip-pull) SKIP_PULL=true ;;
    --skip-backup) SKIP_BACKUP=true ;;
    *) die "Unknown option: $arg" ;;
  esac
done

cd "$ROOT_DIR"
mkdir -p "$STATE_DIR"

echo "── 1/7 Environment check ──"
bash "$ROOT_DIR/deploy/oracle/check-env.sh"

echo ""
echo "── 2/7 Source ──"
if [ "$SKIP_PULL" = false ]; then
  git diff --quiet && git diff --cached --quiet || die "Working tree has local changes — commit/stash them or use --skip-pull"
  git pull --ff-only
fi
TAG="$(git rev-parse --short=12 HEAD)"
ok "Commit $TAG"

PREV_TAG="$(cat "$STATE_DIR/current_tag" 2>/dev/null || true)"

echo ""
echo "── 3/7 Build image terence-app:$TAG ──"
APP_IMAGE_TAG="$TAG" dc build app
ok "Image built"

echo ""
echo "── 4/7 Start data services ──"
dc up -d --wait db redis
dc up -d elasticsearch
ok "db + redis healthy (elasticsearch starting in background)"

echo ""
echo "── 5/7 Backup ──"
if [ "$SKIP_BACKUP" = true ]; then
  warn "Backup skipped (--skip-backup)"
else
  bash "$ROOT_DIR/deploy/oracle/backup-postgres.sh"
fi

echo ""
echo "── 6/7 Prisma migrations ──"
SCHEMA=src/dta/prisma/schema.prisma
PRISMA=(env APP_IMAGE_TAG="$TAG" docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm --no-deps -T app ./node_modules/.bin/prisma)
set +e
STATUS_OUT="$("${PRISMA[@]}" migrate status --schema=$SCHEMA 2>&1)"
STATUS_RC=$?
set -e
echo "$STATUS_OUT" | grep -vE 'postgresql://' || true
if echo "$STATUS_OUT" | grep -q "P3005\|no migration history\|not managed by Prisma Migrate"; then
  die "Database has tables but no migration history. Baseline it manually after verifying the schema (README_DEPLOY_ORACLE.md §Migration) — refusing to auto-baseline."
fi
if echo "$STATUS_OUT" | grep -qi "failed"; then
  die "A previous migration is marked as failed — resolve it manually (prisma migrate resolve) before deploying."
fi
if [ "$STATUS_RC" -ne 0 ] && ! echo "$STATUS_OUT" | grep -qi "have not yet been applied"; then
  die "prisma migrate status failed (exit $STATUS_RC)"
fi
"${PRISMA[@]}" migrate deploy --schema=$SCHEMA
ok "Migrations applied"

echo ""
echo "── 7/7 Start app + proxy ──"
APP_IMAGE_TAG="$TAG" dc up -d --no-build --remove-orphans app livekit caddy
if wait_app_healthy 300; then
  echo "$TAG" > "$STATE_DIR/current_tag"
  [ -n "$PREV_TAG" ] && [ "$PREV_TAG" != "$TAG" ] && echo "$PREV_TAG" > "$STATE_DIR/previous_tag"
  ok "App healthy on terence-app:$TAG"
else
  fail "App did not become healthy. Last log lines:"
  dc logs --tail=60 app || true
  if [ -n "$PREV_TAG" ] && [ "$PREV_TAG" != "$TAG" ]; then
    warn "Switching app back to terence-app:$PREV_TAG"
    APP_IMAGE_TAG="$PREV_TAG" dc up -d --no-build app
    wait_app_healthy 300 && warn "Previous image is serving again (migrations from $TAG remain applied)." \
      || fail "Previous image is also unhealthy — investigate with: docker compose -f docker-compose.prod.yml --env-file .env.production logs app"
  fi
  exit 1
fi

docker image prune -f >/dev/null 2>&1 || true
echo ""
dc ps
ok "Deploy complete: https://$(env_get APP_DOMAIN)"
