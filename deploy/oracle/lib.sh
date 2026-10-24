#!/usr/bin/env bash
# Shared helpers for deploy/oracle/*.sh — sourced, not executed.
# Never echo env values: these scripts only report key NAMES.

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.production}"
COMPOSE_FILE="$ROOT_DIR/docker-compose.prod.yml"
STATE_DIR="$ROOT_DIR/.deploy-state"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"

if [ -t 1 ]; then
  RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; NC=$'\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; NC=''
fi

ok()   { echo "${GREEN}✓${NC} $*"; }
warn() { echo "${YELLOW}!${NC} $*"; }
fail() { echo "${RED}✗${NC} $*" >&2; }
die()  { fail "$*"; exit 1; }

# Default to the image that is currently deployed, so ad-hoc `dc` calls never
# resolve to an unbuilt terence-app:latest.
if [ -z "${APP_IMAGE_TAG:-}" ] && [ -f "$STATE_DIR/current_tag" ]; then
  APP_IMAGE_TAG="$(cat "$STATE_DIR/current_tag")"
fi
export APP_IMAGE_TAG="${APP_IMAGE_TAG:-latest}"

dc() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

# Read one key from the env file without sourcing it (values may contain $ or spaces).
env_get() {
  local key="$1"
  [ -f "$ENV_FILE" ] || return 0
  grep -E "^[[:space:]]*${key}=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//' -e 's/[[:space:]]*$//'
}

# Wait until the app container reports healthy (Docker HEALTHCHECK). $1 = timeout seconds.
wait_app_healthy() {
  local timeout="${1:-240}" waited=0 cid status
  while [ "$waited" -lt "$timeout" ]; do
    cid="$(dc ps -q app 2>/dev/null || true)"
    if [ -n "$cid" ]; then
      status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo unknown)"
      case "$status" in
        healthy) return 0 ;;
        exited|dead) return 1 ;;
      esac
    fi
    sleep 5; waited=$((waited + 5))
  done
  return 1
}
