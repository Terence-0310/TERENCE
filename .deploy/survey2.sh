#!/bin/bash
set +e

echo "=== APP LOCATION (pm2) ==="
pm2 info terence 2>/dev/null | grep -E "script path|exec cwd|node v|status|args" | head -10
echo ""
echo "--- pm2 env keys (count only — values redacted) ---"
pm2 env 0 2>/dev/null | grep "=" | wc -l
echo "Has GEMINI_API_KEY: $(pm2 env 0 2>/dev/null | grep -c '^GEMINI_API_KEY=')"
echo "Has GNEWS_API_KEY:  $(pm2 env 0 2>/dev/null | grep -c '^GNEWS_API_KEY=')"
echo "Has SEPAY_BANK_CODE:$(pm2 env 0 2>/dev/null | grep -c '^SEPAY_BANK_CODE=')"
echo "Has DATABASE_URL:   $(pm2 env 0 2>/dev/null | grep -c '^DATABASE_URL=')"

echo ""
echo "=== FIND APP DIR ==="
# Walk pm2's process file
ls -la /root/.pm2/dump.pm2 2>/dev/null
cat /root/.pm2/dump.pm2 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); [print(p['name'],'->',p.get('pm_cwd'),'|script=',p.get('pm_exec_path')) for p in d]" 2>/dev/null

echo ""
echo "=== DISK USAGE — biggest dirs ==="
du -sh /root/* /var/lib/* /var/log/* /opt/* 2>/dev/null | sort -hr | head -20

echo ""
echo "=== POSTGRES on server (if any) ==="
systemctl list-units 2>/dev/null | grep -i postgres
which psql
ls /var/lib/postgresql/ 2>/dev/null

echo ""
echo "=== DOTENV on server (key names only, no values) ==="
# Find any .env file under /root with a quick grep — just keys
for f in /root/terence/.env /root/TERENCE-main/.env /root/app/.env /opt/terence/.env; do
  if [ -f "$f" ]; then
    echo "FOUND: $f"
    grep -E "^[A-Z_]+=" "$f" | cut -d= -f1
    break
  fi
done
# Also check common docroots
find /root /opt /var/www -maxdepth 3 -name ".env" 2>/dev/null | head -5

echo ""
echo "=== NGINX CONFIG (terence) ==="
cat /etc/nginx/sites-available/terence 2>/dev/null | head -50
