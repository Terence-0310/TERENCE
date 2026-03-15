# 🖥️ Vultr Ubuntu 22.04 — Server Bootstrap

> Copy-paste từng block lệnh khi SSH vào VPS.  
> **Server IP**: 139.180.133.28

---

## 0. SSH vào server

```bash
ssh root@139.180.133.28
```

---

## 1. Update hệ thống

```bash
apt update && apt upgrade -y
```

---

## 2. Cài Git + Curl + Build tools

```bash
apt install -y git curl build-essential
```

---

## 3. Cài Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # v20.x
npm -v    # 10.x
```

---

## 4. Cài PM2

```bash
npm install -g pm2
pm2 -v    # 5.x
```

---

## 5. Cài Nginx

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
systemctl status nginx   # Active: active (running)
```

---

## 6. Cấu hình Firewall (UFW)

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

**Output cần thấy:**
```
Status: active
To                  Action  From
--                  ------  ----
OpenSSH             ALLOW   Anywhere
Nginx Full          ALLOW   Anywhere
```

> ⚠️ PHẢI allow OpenSSH TRƯỚC khi enable UFW, nếu không mất SSH!

---

## 7. Clone repository

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/Terence-0310/TERENCE.git
cd TERENCE
```

---

## 8. Tạo thư mục logs

```bash
mkdir -p /var/www/TERENCE/logs
```

---

## 9. Setup Environment

```bash
cp .env.example .env
nano .env
```

**Điền các giá trị thật:**
```env
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_SITE_URL=https://terence.com.vn
TMDB_API_KEY=<key_v3_tu_tmdb>
TMDB_READ_ACCESS_TOKEN=<token_v4_tu_tmdb>
TMDB_BASE_URL=https://api.themoviedb.org/3
NEXT_PUBLIC_TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p
NEXT_PUBLIC_REGION=VN
```

Lưu: `Ctrl+O` → `Enter` → `Ctrl+X`

---

## 10. Deploy lần đầu

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 11. Cấu hình Nginx

```bash
# Copy config
cp deploy/nginx/terence.conf /etc/nginx/sites-available/terence

# Enable site
ln -s /etc/nginx/sites-available/terence /etc/nginx/sites-enabled/

# Xóa default site
rm -f /etc/nginx/sites-enabled/default

# Test config
nginx -t

# Reload
systemctl reload nginx
```

---

## 12. PM2 auto-start khi reboot

```bash
pm2 startup
# Copy và chạy lệnh sudo mà PM2 in ra
pm2 save
```

---

## 13. Verify

```bash
# App trực tiếp
curl -I http://127.0.0.1:3000

# Qua Nginx
curl -I http://localhost

# PM2 status
pm2 status
```

Xong! Tiếp theo: thiết lập DNS tại Cloudflare → xem `docs/cloudflare-dns-guide.md`
