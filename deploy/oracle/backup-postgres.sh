#!/usr/bin/env bash
# ============================================
# TERENCE — PostgreSQL (+ uploads) backup
# ============================================
# Usage: deploy/oracle/backup-postgres.sh [--with-uploads]
# Writes backups/terence_<UTC timestamp>.dump (pg_dump custom format), verifies
# it with pg_restore --list, keeps BACKUP_RETENTION_DAYS (default 14) days.
# Read-only for the database. Cron example (daily 03:30):
#   30 3 * * * /opt/terence/deploy/oracle/backup-postgres.sh --with-uploads >> /opt/terence/backups/backup.log 2>&1

# shellcheck source=lib.sh
. "$(dirname "$0")/lib.sh"

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
umask 077
mkdir -p "$BACKUP_DIR"

dc ps -q db | grep -q . || die "db container is not running"

OUT="$BACKUP_DIR/terence_${STAMP}.dump"
TMP="$OUT.partial"
echo "Dumping database → ${OUT#"$ROOT_DIR"/}"
# Credentials are read from the container's own env (nothing secret on this command line).
dc exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner' > "$TMP" \
  || { rm -f "$TMP"; die "pg_dump failed"; }

# Verify the archive is readable before accepting it.
dc exec -T db pg_restore --list < "$TMP" > /dev/null || { rm -f "$TMP"; die "backup verification failed"; }
mv "$TMP" "$OUT"
ok "Database backup: $(du -h "$OUT" | cut -f1)"

if [ "${1:-}" = "--with-uploads" ]; then
  UP="$BACKUP_DIR/uploads_${STAMP}.tar.gz"
  dc exec -T app tar -czf - -C /app/public uploads > "$UP" || { rm -f "$UP"; die "uploads backup failed"; }
  ok "Uploads backup: $(du -h "$UP" | cut -f1)"
fi

find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'terence_*.dump' -o -name 'uploads_*.tar.gz' \) -mtime +"$RETENTION_DAYS" -print -delete \
  | sed 's/^/  pruned: /'
echo "$OUT"
