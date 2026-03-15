# 🔐 Nginx + Cloudflare SSL — Setup Guide

## Tổng quan kiến trúc

```
User ─── HTTPS ──→ Cloudflare ─── HTTP ──→ Nginx (:80) ──→ Next.js (:3000)
                    (SSL/CDN)              (reverse proxy)    (PM2)
```

- **Cloudflare** xử lý SSL, CDN, DDoS protection
- **Nginx** là reverse proxy, chuyển request tới Next.js
- **Next.js** chạy trên port 3000 qua PM2

---

## Cài đặt Nginx config

### 1. Copy config file

```bash
cp /var/www/TERENCE/deploy/nginx/terence.conf /etc/nginx/sites-available/terence
```

### 2. Enable site

```bash
ln -s /etc/nginx/sites-available/terence /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
```

### 3. Test và reload

```bash
nginx -t
systemctl reload nginx
```

---

## Config đã bao gồm

| Feature | Status |
|---------|--------|
| Reverse proxy → :3000 | ✅ |
| www → non-www redirect | ✅ |
| Gzip compression | ✅ |
| Static file caching (1 year) | ✅ |
| WebSocket headers | ✅ |
| X-Forwarded-* headers | ✅ |
| Security headers | ✅ |
| client_max_body_size 10M | ✅ |

---

## Tại sao chỉ listen port 80?

Khi dùng Cloudflare **Proxied** + SSL mode **Full**:
- Cloudflare xử lý HTTPS (port 443) cho end user
- Cloudflare gửi request tới server qua HTTP (port 80)
- Nginx chỉ cần listen port 80

→ **Không cần cài Certbot, không cần quản lý certificate trên server.**

---

## Nếu muốn nâng cấp lên Full (Strict)

(Tùy chọn, không bắt buộc)

1. Vào Cloudflare → SSL/TLS → Origin Server → **Create Certificate**
2. Tải cert + key về server
3. Thêm vào Nginx:

```nginx
server {
    listen 443 ssl;
    server_name terence.com.vn;
    ssl_certificate /etc/ssl/cloudflare/terence.pem;
    ssl_certificate_key /etc/ssl/cloudflare/terence.key;
    # ... (giữ nguyên các location block)
}
```

4. Đổi SSL mode sang **Full (Strict)** trên Cloudflare
