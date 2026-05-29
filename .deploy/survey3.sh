#!/bin/bash
set +e

echo "=== /var/www/TERENCE size + git state ==="
du -sh /var/www/TERENCE 2>/dev/null
du -sh /var/www/TERENCE/node_modules /var/www/TERENCE/.next /var/www/TERENCE/logs 2>/dev/null
cd /var/www/TERENCE 2>/dev/null
echo "--- git ---"
git remote -v 2>/dev/null
git branch --show-current 2>/dev/null
git log -1 --pretty="%h %ad %s" 2>/dev/null
echo "--- pending changes? ---"
git status --short 2>/dev/null | head -20

echo ""
echo "=== /var/www/TERENCE/.env (KEY NAMES ONLY) ==="
if [ -f /var/www/TERENCE/.env ]; then
  echo "Total lines: $(wc -l < /var/www/TERENCE/.env)"
  grep -E "^[A-Z][A-Z0-9_]*=" /var/www/TERENCE/.env | cut -d= -f1
fi

echo ""
echo "=== DOES PM2 SEE THE FULL ENV? ==="
# Compare: count keys in .env vs count keys in pm2 runtime env.
echo "Keys in .env file:    $(grep -cE '^[A-Z][A-Z0-9_]*=' /var/www/TERENCE/.env 2>/dev/null)"
echo "Keys in pm2 process:  $(pm2 env 0 2>/dev/null | grep -cE '^[A-Z][A-Z0-9_]*=')"
echo "(if pm2 has fewer, the process was started before .env was last updated — needs --update-env)"

echo ""
echo "=== POSTGRES STATUS ==="
systemctl status postgresql@14-main 2>&1 | head -8
ls /var/lib/postgresql/14/main/ 2>/dev/null | head -5

echo ""
echo "=== DATABASE_URL points where? (just host, redact creds) ==="
grep -E "^DATABASE_URL" /var/www/TERENCE/.env 2>/dev/null | sed 's|://[^@]*@|://<redacted>@|; s|password=[^&]*|password=<redacted>|g'

echo ""
echo "=== RECENT APP LOGS ==="
pm2 logs terence --lines 20 --nostream 2>/dev/null | tail -25

echo ""
echo "=== APP RESPONSE CHECK ==="
curl -s -o /dev/null -w "Local 3000 -> HTTP %{http_code}\n" -m 5 http://127.0.0.1:3000/api/health
curl -s -m 5 http://127.0.0.1:3000/api/health 2>/dev/null
