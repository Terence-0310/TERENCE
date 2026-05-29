#!/bin/bash
# Disk cleanup — safe operations only. Stops MS SQL Server before removing
# its data dir (so files aren't held open). Reports free space before/after.
set +e

echo "=== BEFORE ==="
df -h / | tail -1

echo ""
echo "--- apt cache ---"
apt-get clean
apt-get autoremove -y 2>&1 | tail -3

echo ""
echo "--- journalctl ---"
journalctl --vacuum-time=3d 2>&1 | tail -3

echo ""
echo "--- btmp logs (failed login records) ---"
rm -f /var/log/btmp /var/log/btmp.1
echo "removed btmp + btmp.1"

echo ""
echo "--- nginx access logs (keep file, truncate) ---"
for f in /var/log/nginx/access.log /var/log/nginx/access.log.1 /var/log/nginx/error.log; do
  [ -f "$f" ] && : > "$f" && echo "truncated $f"
done

echo ""
echo "--- MS SQL Server (1.3GB unused) ---"
# Stop and disable before removing files; otherwise the dpkg / file removal
# may leave residual processes that re-spawn or hold disk locks.
systemctl stop mssql-server 2>/dev/null && echo "stopped mssql-server"
systemctl disable mssql-server 2>/dev/null
# Remove packages (the apt way — keeps /etc/apt consistent).
DEBIAN_FRONTEND=noninteractive apt-get purge -y mssql-server mssql-tools msodbcsql17 msodbcsql18 unixodbc-dev mssql-tools18 2>&1 | tail -3
rm -rf /opt/mssql /opt/microsoft /opt/mssql-tools18 /var/opt/mssql 2>/dev/null
echo "removed /opt/mssql and friends"

echo ""
echo "--- old DB backups in /root ---"
rm -f /root/terence_dev.sql /root/terence_dev.dump /root/dump.sql
echo "removed sql dumps"

echo ""
echo "=== AFTER ==="
df -h / | tail -1
