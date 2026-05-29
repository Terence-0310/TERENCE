#!/bin/bash
set +e
echo "=== smoke test ==="
for url in /api/v1/home /news /movies /api/v1/movies/recommendations /api/v1/reviews/top /tcoin /api/health; do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$url)
  echo "  $code  $url"
done
echo ""
echo "=== pm2 recent errors ==="
pm2 logs terence --err --lines 30 --nostream 2>&1 | grep -E 'ERROR|error|fatal' | grep -v 'GNews search error' | grep -v "Can't reach database" | tail -20
echo ""
echo "=== process status ==="
pm2 list 2>&1 | tail -5
