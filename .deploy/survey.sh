#!/bin/bash
set +e

echo "=== HARDWARE ==="
echo "CPUs: $(nproc)"; free -h | head -3; df -h / 2>/dev/null | head -2

echo ""
echo "=== TOOLS ==="
for cmd in docker git node npm pm2 nginx caddy certbot; do
  v=$($cmd --version 2>/dev/null | head -1)
  echo "  $cmd: ${v:-NOT INSTALLED}"
done
echo "  docker compose: $(docker compose version 2>/dev/null | head -1 || echo NOT INSTALLED)"

echo ""
echo "=== DOCKER CONTAINERS (running + stopped) ==="
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" 2>/dev/null || echo "(docker not available)"

echo ""
echo "=== DOCKER IMAGES (top 15) ==="
docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedSince}}\t{{.Size}}" 2>/dev/null | head -15

echo ""
echo "=== PORTS LISTENING ==="
ss -tlnp 2>/dev/null | head -20

echo ""
echo "=== PM2 LIST ==="
pm2 list 2>/dev/null || echo "(no pm2)"

echo ""
echo "=== WEB-SERVER SERVICES ==="
systemctl list-units --type=service --state=running 2>/dev/null | grep -iE "nginx|caddy|apache|node|next|docker" | head

echo ""
echo "=== DIRS /root and /opt ==="
ls -la /root/ 2>/dev/null | grep -v '^total' | head -30
echo "--- /opt ---"
ls -la /opt/ 2>/dev/null | grep -v '^total' | head

echo ""
echo "=== NGINX SITES ==="
ls -la /etc/nginx/sites-enabled/ 2>/dev/null | head
echo "--- caddy ---"
ls -la /etc/caddy/ 2>/dev/null | head

echo ""
echo "=== DNS / DOMAIN ==="
# Best-effort check whether the server name actually points back at this IP.
curl -s -m 5 ifconfig.me 2>/dev/null; echo
host terence.com.vn 2>/dev/null | head -3 || echo "(no host cmd)"
