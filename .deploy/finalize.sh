#!/bin/bash
set +e
echo "=== restart pm2 (pick up updated prisma client) ==="
pm2 restart terence --update-env 2>&1 | tail -3
sleep 5

echo ""
echo "=== save pm2 config (so it restarts on reboot) ==="
pm2 save 2>&1 | tail -3

echo ""
echo "=== ensure services enabled on boot ==="
systemctl is-enabled postgresql 2>&1
systemctl is-enabled redis-server 2>&1
systemctl is-enabled nginx 2>&1

echo ""
echo "=== final smoke ==="
for url in / /news /movies /tcoin /api/health /api/v1/home /api/v1/movies/recommendations; do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$url)
  echo "  $code  $url"
done

echo ""
echo "=== external HTTPS ==="
for path in / /news /movies; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' https://terence.com.vn$path)
  echo "  $code  https://terence.com.vn$path"
done

echo ""
echo "=== disk / memory ==="
df -h / | tail -1
free -m | head -2

echo ""
echo "=== pm2 status ==="
pm2 list 2>&1 | tail -6
