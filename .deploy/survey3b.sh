#!/bin/bash
set +e

echo "=== /var/www/TERENCE size ==="
du -sh /var/www/TERENCE 2>/dev/null
du -sh /var/www/TERENCE/node_modules 2>/dev/null
du -sh /var/www/TERENCE/.next 2>/dev/null

echo ""
echo "=== git state ==="
cd /var/www/TERENCE && git log -1 --pretty="%h %ad %s" 2>/dev/null

echo ""
echo "=== ENV file keys ==="
if [ -f /var/www/TERENCE/.env ]; then
  echo "Total keys: $(grep -cE '^[A-Z][A-Z0-9_]*=' /var/www/TERENCE/.env)"
  echo "Has GEMINI_API_KEY:    $(grep -c '^GEMINI_API_KEY=' /var/www/TERENCE/.env)"
  echo "Has GNEWS_API_KEY:     $(grep -c '^GNEWS_API_KEY=' /var/www/TERENCE/.env)"
  echo "Has SEPAY_BANK_CODE:   $(grep -c '^SEPAY_BANK_CODE=' /var/www/TERENCE/.env)"
  echo "Has DATABASE_URL:      $(grep -c '^DATABASE_URL=' /var/www/TERENCE/.env)"
  echo "Has NEXTAUTH_URL:      $(grep -c '^NEXTAUTH_URL=' /var/www/TERENCE/.env)"
fi
echo "DATABASE_URL host: $(grep '^DATABASE_URL=' /var/www/TERENCE/.env 2>/dev/null | sed 's|.*@\([^/]*\).*|\1|')"
echo "NEXTAUTH_URL:      $(grep '^NEXTAUTH_URL=' /var/www/TERENCE/.env 2>/dev/null | cut -d= -f2-)"

echo ""
echo "=== APP RESPONSE ==="
curl -s -o /dev/null -w "%{http_code}" -m 5 http://127.0.0.1:3000/api/health
echo ""
timeout 5 curl -s http://127.0.0.1:3000/api/health 2>/dev/null | head -c 300

echo ""
echo "=== PG STATUS short ==="
systemctl is-active postgresql@14-main
