#!/bin/bash
set +e

echo "=== BEFORE ==="
df -h / | tail -1

echo ""
echo "--- big stuff on /var/www/TERENCE ---"
du -sh /var/www/TERENCE/.next 2>/dev/null
du -sh /var/www/TERENCE/node_modules 2>/dev/null
du -sh /var/www/TERENCE/logs 2>/dev/null
du -sh /var/www/TERENCE/.pm2 2>/dev/null
du -sh /root/.npm 2>/dev/null
du -sh /root/.pm2 2>/dev/null
du -sh /root/.cache 2>/dev/null

echo ""
echo "--- npm cache ---"
npm cache clean --force 2>&1 | tail -2

echo ""
echo "--- pm2 logs ---"
pm2 flush 2>&1 | tail -3

echo ""
echo "--- old .next build (safe — will rebuild) ---"
rm -rf /var/www/TERENCE/.next/cache 2>/dev/null
echo "removed /var/www/TERENCE/.next/cache"

echo ""
echo "--- snap cache + unused snaps ---"
# Snap accumulates inactive revisions; keep only the latest.
LANG=C snap list --all 2>/dev/null | awk '/disabled/{print $1, $3}' | \
  while read snapname rev; do snap remove "$snapname" --revision="$rev" 2>/dev/null && echo "removed $snapname/$rev"; done
rm -rf /var/lib/snapd/cache/* 2>/dev/null

echo ""
echo "--- apt-get autoclean (orphan archives) ---"
apt-get autoclean -y 2>&1 | tail -2

echo ""
echo "--- compress large logs ---"
find /var/log -name "*.log.*" -size +5M ! -name "*.gz" -exec gzip {} \; 2>/dev/null

echo ""
echo "=== AFTER ==="
df -h / | tail -1
echo ""
echo "--- top dirs by size ---"
du -shx /var/* /root/* /opt/* 2>/dev/null | sort -hr | head -15
