# ☁️ Cloudflare DNS — Hướng Dẫn Thiết Lập

> **Domain**: terence.com.vn  
> **Server IP**: 139.180.133.28  
> **DNS provider hiện tại**: iNET → sẽ chuyển nameserver sang Cloudflare

---

## 1. Thêm site vào Cloudflare

1. Đăng nhập [dash.cloudflare.com](https://dash.cloudflare.com)
2. Nhấn **"Add a site"**
3. Nhập: `terence.com.vn`
4. Chọn plan: **Free**
5. Nhấn **Continue**

---

## 2. Tạo DNS Records

Cloudflare sẽ quét DNS hiện tại. Xóa tất cả record cũ (nếu có), rồi tạo:

| Type | Name | Content | Proxy status | TTL |
|------|------|---------|-------------|-----|
| **A** | **@** | `139.180.133.28` | **Proxied** ☁️ | Auto |
| **A** | **www** | `139.180.133.28` | **Proxied** ☁️ | Auto |

> ⚠️ **BẮT BUỘC chọn Proxied** (biểu tượng đám mây cam ☁️). Nếu chọn DNS-only thì Cloudflare không proxy traffic và không bảo vệ IP server.

Nhấn **Continue** sau khi tạo xong.

---

## 3. Đổi Nameserver tại iNET

Cloudflare sẽ hiển thị **2 nameservers**, ví dụ:

```
gina.ns.cloudflare.com
kurt.ns.cloudflare.com
```

### Thao tác tại iNET:

1. Đăng nhập [my.inet.vn](https://my.inet.vn)
2. Vào **Quản lý tên miền** → chọn `terence.com.vn`
3. Tìm mục **Nameserver** hoặc **DNS** → **Đổi Nameserver**
4. Xóa nameserver cũ của iNET
5. Thêm 2 nameserver Cloudflare:

```
gina.ns.cloudflare.com
kurt.ns.cloudflare.com
```

> ⚠️ Dùng nameserver Cloudflare hiển thị cho bạn, không copy ví dụ trên.

6. Lưu thay đổi

### Đợi propagate

- Thường mất **15 phút → 24 giờ** (phổ biến 1-2 giờ)
- Cloudflare sẽ gửi email khi site active
- Kiểm tra trạng thái tại Cloudflare Dashboard → Overview → status

---

## 4. Kiểm tra DNS đã chuyển

```bash
# Trên máy local (PowerShell)
nslookup terence.com.vn 8.8.8.8

# Hoặc trên VPS
dig terence.com.vn +short
```

**Kết quả đúng khi Cloudflare Proxied**: IP sẽ là IP Cloudflare (không phải 139.180.133.28 — đó là bình thường vì Cloudflare proxy).

Nếu vẫn thấy IP iNET cũ → nameserver chưa propagate, chờ thêm.

---

## 5. Lưu ý quan trọng

- **Không** dùng CNAME cho root domain (`@`) — Cloudflare hỗ trợ CNAME flattening nhưng A record đơn giản hơn
- Khi dùng **Proxied**, IP thật của server được ẩn — đây là điều mong muốn
- Nếu cần SSH trực tiếp bằng domain (không khuyến khích), tạo thêm:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | ssh | 139.180.133.28 | **DNS only** (xám) |

Rồi SSH qua: `ssh root@ssh.terence.com.vn`
