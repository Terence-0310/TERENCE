#!/bin/bash
# ============================================
# Install Elasticsearch 8 on Vultr — minimal config
# ============================================
# - Single-node, no security (bound to 127.0.0.1 only — Nginx never proxies)
# - 512MB heap so we leave headroom for Node + Postgres on a 3.8GB box
# - systemd unit enabled so it survives reboot
set -e

echo "=== APT repo ==="
if [ ! -f /etc/apt/sources.list.d/elastic-8.x.list ]; then
  apt-get install -y apt-transport-https gnupg ca-certificates 2>&1 | tail -2
  wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" \
    > /etc/apt/sources.list.d/elastic-8.x.list
fi

apt-get update -q 2>&1 | tail -3

echo ""
echo "=== Install elasticsearch ==="
DEBIAN_FRONTEND=noninteractive apt-get install -y elasticsearch 2>&1 | tail -5

echo ""
echo "=== Override config (security off, bind localhost, single-node) ==="
cat > /etc/elasticsearch/elasticsearch.yml <<'YAML'
# TERENCE — minimal single-node config
cluster.name: terence-cluster
node.name: terence-node1
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch
network.host: 127.0.0.1
http.port: 9200
discovery.type: single-node

# Security off — we never expose 9200 outside localhost. Nginx does not
# proxy /api/elasticsearch* either. App authenticates via no-auth client.
xpack.security.enabled: false
xpack.security.enrollment.enabled: false
xpack.security.http.ssl.enabled: false
xpack.security.transport.ssl.enabled: false
YAML
chown root:elasticsearch /etc/elasticsearch/elasticsearch.yml
chmod 660 /etc/elasticsearch/elasticsearch.yml

echo ""
echo "=== Heap = 512MB (low-RAM box, swap available) ==="
mkdir -p /etc/elasticsearch/jvm.options.d
cat > /etc/elasticsearch/jvm.options.d/heap.options <<'JVM'
-Xms512m
-Xmx512m
JVM

echo ""
echo "=== Enable + start ==="
systemctl daemon-reload
systemctl enable elasticsearch 2>&1 | tail -2
systemctl restart elasticsearch
echo "  Waiting up to 90s for ES to accept connections..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:9200; then
    echo "  ✓ ES responding after ${i}×3s"
    break
  fi
  sleep 3
done

echo ""
echo "=== Smoke ==="
curl -s http://localhost:9200 | head -c 400
echo ""
echo "---"
curl -s http://localhost:9200/_cluster/health
echo ""
echo ""
echo "=== Memory after ES start ==="
free -h
