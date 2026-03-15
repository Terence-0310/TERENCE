# 🔐 Cloudflare SSL — Hướng Dẫn Thiết Lập

> Với Cloudflare Proxied, SSL được xử lý tại Cloudflare.  
> **Không cần cài Certbot trên server.**

---

## 1. Chọn SSL Mode

1. Vào [dash.cloudflare.com](https://dash.cloudflare.com)
2. Chọn site `terence.com.vn`
3. Vào **SSL/TLS** → **Overview**
4. Chọn: **Full**

### Giải thích SSL modes:

| Mode | Mô tả | Dùng khi |
|------|--------|----------|
| Off | Không SSL | ❌ Không bao giờ |
| Flexible | HTTPS giữa user↔Cloudflare, HTTP giữa CF↔server | ⚠️ Kém an toàn |
| **Full** ✅ | HTTPS cả hai đầu, CF chấp nhận self-signed cert | ✅ **Dùng cái này** |
| Full (Strict) | HTTPS cả hai đầu, yêu cầu cert hợp lệ từ server | Nâng cấp sau |

> **Chọn Full** là đủ cho production. Nginx listen port 80, Cloudflare tự xử lý HTTPS cho user.

---

## 2. Bật các tính năng bảo mật

### SSL/TLS → Edge Certificates

- [x] **Always Use HTTPS**: bật → redirect HTTP → HTTPS
- [x] **Automatic HTTPS Rewrites**: bật
- [x] **Minimum TLS Version**: TLS 1.2

### Speed → Optimization

- [x] **Auto Minify**: bật JavaScript, CSS, HTML
- [x] **Brotli**: bật

### Security

- **Security Level**: Medium (mặc định, đủ tốt)
- **Bot Fight Mode**: bật (Free plan)
- **Browser Integrity Check**: bật

---

## 3. Kiểm tra SSL hoạt động

Sau khi DNS propagate + Cloudflare active:

```bash
curl -I https://terence.com.vn
```

**Kết quả đúng:**
```
HTTP/2 200
server: cloudflare
cf-ray: xxxxx
...
```

Mở trình duyệt: `https://terence.com.vn` → 🔒 khóa xanh.

---

## 4. Tại sao không cần Certbot?

Khi dùng Cloudflare **Proxied**:
- Traffic: `User → HTTPS → Cloudflare → HTTP → Nginx → App`
- Cloudflare tự có certificate cho `terence.com.vn`
- Nginx chỉ cần listen port 80 (HTTP)
- Không cần cài/renew/quản lý certificate trên server

> Nếu muốn nâng lên **Full (Strict)** (HTTPS giữa CF↔server), tạo **Cloudflare Origin Certificate** và cấu hình Nginx listen port 443 với cert đó. Nhưng Full mode đã đủ cho hầu hết use cases.
