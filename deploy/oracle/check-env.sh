#!/usr/bin/env bash
# ============================================
# TERENCE — pre-deploy environment check (read-only)
# ============================================
# Usage: deploy/oracle/check-env.sh
# Checks host (arch, Docker, RAM, disk, sysctl), the env file (presence,
# permissions, required keys, placeholder values) and DNS. Prints key names
# only — never values. Exit code 1 if any blocking problem is found.

# shellcheck source=lib.sh
. "$(dirname "$0")/lib.sh"

ERRORS=0
err() { fail "$*"; ERRORS=$((ERRORS + 1)); }

echo "── Host ──"
ARCH="$(uname -m)"
[ "$ARCH" = "aarch64" ] && ok "Architecture: aarch64 (ARM64)" || warn "Architecture is $ARCH (expected aarch64 on OCI A1 — fine if intentional)"
if [ -r /etc/os-release ]; then . /etc/os-release; ok "OS: ${PRETTY_NAME:-unknown}"; fi

if command -v docker >/dev/null 2>&1; then
  ok "Docker: $(docker version --format '{{.Server.Version}}' 2>/dev/null || echo 'daemon not reachable')"
  docker compose version >/dev/null 2>&1 && ok "Compose: $(docker compose version --short)" || err "docker compose plugin missing"
  docker info >/dev/null 2>&1 || err "Cannot talk to the Docker daemon (is your user in the 'docker' group?)"
else
  err "Docker is not installed"
fi

MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
[ "$MEM_MB" -ge 11000 ] && ok "RAM: ${MEM_MB} MB" || warn "RAM: ${MEM_MB} MB (stack is sized for 12 GB; lower ES_JAVA_OPTS / limits if smaller)"
SWAP_MB=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)
[ "$SWAP_MB" -ge 2048 ] && ok "Swap: ${SWAP_MB} MB" || warn "Swap: ${SWAP_MB} MB (recommend ≥4 GB swap for image builds)"

DISK_GB=$(df -BG --output=avail "$ROOT_DIR" | tail -n 1 | tr -dc '0-9')
[ "$DISK_GB" -ge 15 ] && ok "Free disk: ${DISK_GB} GB" || err "Free disk: ${DISK_GB} GB (need ≥15 GB for images, data and backups)"

MAP_COUNT=$(cat /proc/sys/vm/max_map_count 2>/dev/null || echo 0)
[ "$MAP_COUNT" -ge 262144 ] && ok "vm.max_map_count=$MAP_COUNT" || warn "vm.max_map_count=$MAP_COUNT (Elasticsearch recommends 262144 — see README_DEPLOY_ORACLE.md)"

for port in 80 443; do
  if command -v ss >/dev/null 2>&1 && ss -ltnH "sport = :$port" 2>/dev/null | grep -q .; then
    if dc ps -q caddy 2>/dev/null | grep -q .; then ok "Port $port in use by this stack's Caddy"
    else err "Port $port already in use by another process (nginx/apache?)"; fi
  fi
done

echo ""
echo "── Env file: ${ENV_FILE#"$ROOT_DIR"/} ──"
if [ ! -f "$ENV_FILE" ]; then
  err "Missing. Run: cp deploy/oracle/env.production.example .env.production && chmod 600 .env.production"
else
  PERM=$(stat -c '%a' "$ENV_FILE")
  case "$PERM" in 600|400) ok "Permissions $PERM" ;; *) err "Permissions $PERM — run: chmod 600 .env.production" ;; esac
  if git -C "$ROOT_DIR" ls-files --error-unmatch "$ENV_FILE" >/dev/null 2>&1; then err "env file is tracked by git!"; fi

  for key in APP_DOMAIN LIVEKIT_DOMAIN ACME_EMAIL; do
    v="$(env_get "$key")"
    if [ -z "$v" ]; then err "$key is empty"
    elif echo "$v" | grep -qiE 'example\.(com|org)|localhost|127\.0\.0\.1'; then err "$key still has a placeholder/localhost value"
    else ok "$key set"; fi
  done

  for key in NEXTAUTH_SECRET CRON_SECRET POSTGRES_PASSWORD REDIS_PASSWORD ELASTIC_PASSWORD LIVEKIT_API_SECRET; do
    v="$(env_get "$key")"
    if [ -z "$v" ]; then err "$key is empty"
    elif echo "$v" | grep -qiE '^(change-?me|secret|password|postgres|admin|devkey)'; then err "$key looks like a default/placeholder"
    elif [ "${#v}" -lt 32 ]; then err "$key is shorter than 32 characters"
    else ok "$key set (${#v} chars)"; fi
  done
  [ -n "$(env_get LIVEKIT_API_KEY)" ] && ok "LIVEKIT_API_KEY set" || err "LIVEKIT_API_KEY is empty"

  for key in POSTGRES_PASSWORD REDIS_PASSWORD; do
    v="$(env_get "$key")"
    if [ -n "$v" ] && ! echo "$v" | grep -qE '^[A-Za-z0-9._~-]+$'; then
      err "$key contains URL-reserved characters (it is embedded in DATABASE_URL/REDIS_URL) — use openssl rand -hex 32"
    fi
  done

  for key in NEXTAUTH_URL APP_URL NEXT_PUBLIC_SITE_URL DATABASE_URL REDIS_URL ELASTICSEARCH_HOST NEXT_PUBLIC_LIVEKIT_URL; do
    [ -n "$(env_get "$key")" ] && warn "$key is set in the env file but docker-compose.prod.yml overrides it — remove it to avoid confusion"
  done

  [ -n "$(env_get SMTP_HOST)" ] && ok "SMTP configured" || warn "SMTP_HOST empty — register/reset-password emails will fail"
  [ -n "$(env_get TMDB_API_KEY)$(env_get TMDB_READ_ACCESS_TOKEN)" ] && ok "TMDB configured" || warn "TMDB keys empty — metadata enrichment disabled"
  [ -n "$(env_get SEPAY_WEBHOOK_API_KEY)" ] && ok "SePay webhook key set" || warn "SEPAY_WEBHOOK_API_KEY empty — webhooks rejected (top-ups disabled)"
  if [ "$(env_get NEXT_PUBLIC_GOOGLE_AUTH_ENABLED)" = "true" ] && [ -z "$(env_get GOOGLE_CLIENT_SECRET)" ]; then
    err "NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true but GOOGLE_CLIENT_ID/SECRET missing"
  fi

  echo ""
  echo "── DNS ──"
  for key in APP_DOMAIN LIVEKIT_DOMAIN; do
    d="$(env_get "$key")"
    [ -z "$d" ] && continue
    ip="$(getent ahostsv4 "$d" 2>/dev/null | awk 'NR==1 {print $1}')"
    [ -n "$ip" ] && ok "$d → $ip (must be this VM's public IP)" || warn "$d does not resolve yet — Let's Encrypt will fail until it does"
  done

  echo ""
  echo "── Compose file ──"
  if dc config --quiet 2>/dev/null; then ok "docker-compose.prod.yml is valid with this env file"
  else err "docker compose config failed (run: docker compose -f docker-compose.prod.yml --env-file .env.production config --quiet)"; fi
fi

echo ""
if [ "$ERRORS" -gt 0 ]; then die "$ERRORS blocking problem(s) found."; fi
ok "Environment looks ready."
