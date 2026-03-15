# 🚀 TERENCE — Deploy Production Guide

> **Tổng hợp toàn bộ quy trình deploy — 1 file duy nhất**  
> Domain: `terence.com.vn` | VPS: `139.180.133.28` | DNS/CDN: Cloudflare

---

## Kiến trúc

```
User ─── HTTPS ──→ Cloudflare ─── HTTP ──→ Nginx (:80) ──→ Next.js (:3000)
                    (SSL/CDN)              (reverse proxy)    (PM2)
```

---

## Thứ tự thực hiện

| # | Bước | Tài liệu chi tiết |
|---|------|--------------------|
| 1 | Setup VPS | `docs/vultr-bootstrap.md` |
| 2 | Đăng ký Cloudflare + DNS | `docs/cloudflare-dns-guide.md` |
| 3 | Cấu hình SSL | `docs/cloudflare-ssl-guide.md` |
| 4 | Cấu hình Nginx | `docs/nginx-cloudflare-setup.md` |
| 5 | Deploy app | `deploy.sh` |
| 6 | Kiểm tra | `docs/post-deploy-checklist.md` |
| 7 | Hiểu biến .env | `docs/env-production.md` |

---

## Lệnh deploy lần đầu (trên VPS)

```bash
# === SYSTEM ===
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git curl build-essential nginx
npm install -g pm2
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable

# === APP ===
mkdir -p /var/www && cd /var/www
git clone https://github.com/Terence-0310/TERENCE.git && cd TERENCE
mkdir -p logs
cp .env.example .env && nano .env    # ← Điền TMDB keys
chmod +x deploy.sh && ./deploy.sh

# === NGINX ===
cp deploy/nginx/terence.conf /etc/nginx/sites-available/terence
ln -s /etc/nginx/sites-available/terence /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# === PM2 AUTO-START ===
pm2 startup    # copy + chạy lệnh sudo
pm2 save

# === VERIFY ===
curl -I http://127.0.0.1:3000
curl -I http://localhost
pm2 status
```

---

## Update các lần sau

```bash
cd /var/www/TERENCE && ./deploy.sh
```

Hoặc thủ công:

```bash
cd /var/www/TERENCE
git pull origin main
npm install
npm run build
pm2 restart terence
```

---

## Cloudflare DNS (tại Cloudflare Dashboard)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | 139.180.133.28 | Proxied ☁️ |
| A | www | 139.180.133.28 | Proxied ☁️ |

---

## Đổi Nameserver (tại iNET)

1. Vào [my.inet.vn](https://my.inet.vn) → Quản lý tên miền → `terence.com.vn`
2. Đổi Nameserver sang 2 nameserver Cloudflare cấp cho bạn
3. Chờ propagate (15 phút → 24 giờ)

---

## Cloudflare SSL

- SSL mode: **Full**
- Always Use HTTPS: **Bật**
- Auto Minify: **Bật**
- Brotli: **Bật**

---

## Biến .env cần điền

```env
TMDB_API_KEY=<lấy tại themoviedb.org/settings/api>
TMDB_READ_ACCESS_TOKEN=<bearer token v4>
NEXT_PUBLIC_SITE_URL=https://terence.com.vn
```
