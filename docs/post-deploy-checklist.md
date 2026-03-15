# ✅ Post-Deploy Checklist

## Kiểm tra ngay sau deploy

### 1. PM2

```bash
pm2 status
# ✅ terence | online | 0 restarts
```

```bash
pm2 logs terence --lines 20
# ✅ Không có error, thấy "Ready" hoặc "started server"
```

### 2. App trực tiếp

```bash
curl -I http://127.0.0.1:3000
# ✅ HTTP/1.1 200 OK
```

### 3. Nginx

```bash
nginx -t
# ✅ syntax is ok / test is successful
```

```bash
systemctl status nginx
# ✅ Active: active (running)
```

```bash
curl -I http://localhost
# ✅ HTTP/1.1 200 OK
```

### 4. DNS (sau khi Cloudflare active)

```bash
nslookup terence.com.vn 8.8.8.8
# ✅ Trả về IP Cloudflare (không phải IP server — đó là đúng)
```

### 5. HTTPS

```bash
curl -I https://terence.com.vn
# ✅ HTTP/2 200, server: cloudflare
```

Mở trình duyệt: `https://terence.com.vn` → 🔒 khóa xanh, thấy trang web.

---

## Troubleshooting

### 🔴 `pm2 status` → errored

```bash
# Xem lỗi
pm2 logs terence --lines 50 --err

# Lỗi phổ biến:
# "Cannot find module" → chưa build
npm run build && pm2 restart terence

# "EADDRINUSE" → port 3000 bị chiếm
kill -9 $(lsof -t -i:3000) 2>/dev/null
pm2 restart terence

# "Missing API credentials" → thiếu .env
nano /var/www/TERENCE/.env
pm2 restart terence
```

### 🔴 `curl http://127.0.0.1:3000` → Connection refused

```bash
# App chưa chạy
pm2 status
# Nếu không thấy "terence":
cd /var/www/TERENCE && pm2 start ecosystem.config.js
```

### 🔴 `curl http://localhost` → 502 Bad Gateway

```bash
# Nginx chạy nhưng app không phản hồi
# Kiểm tra app trước:
curl -I http://127.0.0.1:3000

# Nếu app OK nhưng Nginx 502:
nginx -t                    # kiểm tra config
systemctl reload nginx      # reload
```

### 🔴 `https://terence.com.vn` → timeout / DNS error

```bash
# DNS chưa propagate
nslookup terence.com.vn 8.8.8.8

# Nếu vẫn trả về IP iNET cũ → chờ thêm (lên tới 24h)
# Kiểm tra tại: https://dnschecker.org/#A/terence.com.vn
```

### 🔴 `https://terence.com.vn` → SSL error / redirect loop

```bash
# Kiểm tra Cloudflare SSL mode
# Phải là "Full" (KHÔNG phải "Flexible")
# Flexible gây redirect loop vì Nginx không listen 443

# Vào Cloudflare → SSL/TLS → Overview → chọn Full
```

### 🔴 Trang trắng / không có data phim

```bash
# Kiểm tra TMDB key
cat /var/www/TERENCE/.env | grep TMDB

# Test TMDB API
curl -s "https://api.themoviedb.org/3/movie/popular?api_key=YOUR_KEY" | head -100
# Phải trả về JSON

# Nếu key sai → sửa .env → build lại
nano /var/www/TERENCE/.env
cd /var/www/TERENCE && npm run build && pm2 restart terence
```

### 🔴 Build fail

```bash
# Xem lỗi build chi tiết
cd /var/www/TERENCE
npm run build 2>&1 | tail -50

# Lỗi phổ biến:
# Out of memory (VPS nhỏ)
NODE_OPTIONS="--max-old-space-size=1024" npm run build

# Module not found
npm install
npm run build
```

---

## Quick Health Check Script

Chạy tất cả kiểm tra cùng lúc:

```bash
echo "=== PM2 ===" && pm2 jlist | python3 -c "import sys,json; d=json.load(sys.stdin); [print(f'  {a[\"name\"]}: {a[\"pm2_env\"][\"status\"]} (restarts: {a[\"pm2_env\"][\"restart_time\"]})') for a in d]" 2>/dev/null || pm2 status
echo ""
echo "=== App ===" && curl -sI http://127.0.0.1:3000 | head -3
echo ""
echo "=== Nginx ===" && systemctl is-active nginx
echo ""
echo "=== HTTPS ===" && curl -sI https://terence.com.vn 2>&1 | head -3
echo ""
echo "=== Disk ===" && df -h / | tail -1
echo "=== RAM ===" && free -h | grep Mem
```
