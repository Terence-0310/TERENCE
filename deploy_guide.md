# 🚀 TERENCE — Lệnh Deploy Production (Vultr VPS)

> **Quan trọng**: Dùng file `.env` (KHÔNG phải `.env.local`) vì **Prisma CLI chỉ đọc `.env`**.

---

## Bước 1: SSH vào server

```bash
ssh root@<server-ip>
```

## Bước 2: Xóa code cũ và clone lại (nếu cần)

```bash
# Nếu đã có /var/www/TERENCE thì xóa
rm -rf /var/www/TERENCE

# Clone repo mới
cd /var/www
git clone https://github.com/Terence-0310/TERENCE.git TERENCE
cd /var/www/TERENCE
```

> [!IMPORTANT]
> Đảm bảo code nằm trực tiếp ở `/var/www/TERENCE/` (chứa `package.json`, `app/`, `components/`, ...).
> **KHÔNG PHẢI** `/var/www/TERENCE/TERENCE-main/`.

## Bước 3: Tạo file `.env` ĐÚNG

```bash
nano /var/www/TERENCE/.env
```

**Paste đúng nội dung sau** (thay thế hoàn toàn nội dung cũ):

```env
NODE_ENV=production
PORT=3000

DATABASE_URL="file:./prisma/dev.db"

NEXT_PUBLIC_SITE_URL=https://terence.com.vn

TMDB_API_KEY=3fa46a8141c036384e2a040e317f2ce1
TMDB_READ_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzZmE0NmE4MTQxYzAzNjM4NGUyYTA0MGUzMTdmMmNlMSIsIm5iZiI6MTc3MzEzMzcxNS40ODEsInN1YiI6IjY5YWZkZjkzMDc1NTdhMDc1MzQ1MGQ0ZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.5NUMv563p4uIAlnq_XIfJ9TJN3m5X9oWr9bEXnn9D1Y
TMDB_BASE_URL=https://api.themoviedb.org/3

NEXT_PUBLIC_TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p
NEXT_PUBLIC_REGION=VN
```

Lưu: `Ctrl+O` → `Enter` → `Ctrl+X`

> [!CAUTION]
> **XÓA** các biến sau vì dự án **KHÔNG DÙNG**:
> - ~~NEXTAUTH_URL~~ ❌
> - ~~NEXTAUTH_SECRET~~ ❌
> - ~~AUTH_SECRET~~ ❌
> - ~~JWT_SECRET~~ ❌
> - ~~NEXT_PUBLIC_TMDB_BASE_URL~~ ❌ (phải là `TMDB_BASE_URL` không có `NEXT_PUBLIC_`)
> - ~~TMDB_ACCESS_TOKEN~~ ❌ (phải là `TMDB_READ_ACCESS_TOKEN`)

> [!WARNING]
> **Phải dùng `.env`** — KHÔNG dùng `.env.local`!
> Prisma CLI chỉ đọc `.env`, nếu dùng `.env.local` sẽ bị lỗi `DATABASE_URL not found`.
> Nếu đang có `.env.local`, chạy: `mv .env.local .env`

## Bước 4: Cài dependencies + Build + Deploy

```bash
cd /var/www/TERENCE

# Cài dependencies
npm install

# Generate Prisma client
npx prisma generate

# Chạy migration database
npx prisma migrate deploy

# Seed dữ liệu mẫu (admin, phim, ...)
npx prisma db seed

# Build production
npm run build
```

## Bước 5: Tạo thư mục logs và start PM2

```bash
# Tạo thư mục logs
mkdir -p /var/www/TERENCE/logs

# Stop process cũ nếu có
pm2 delete terence 2>/dev/null || true

# Start app mới
pm2 start ecosystem.config.js

# Lưu trạng thái PM2
pm2 save

# Kiểm tra
pm2 status
```

## Bước 6: Kiểm tra

```bash
# Test local
curl -I http://127.0.0.1:3000

# Xem logs nếu có lỗi
pm2 logs terence --lines 30
```

---

## Hoặc: Chạy tất cả bằng deploy script

```bash
cd /var/www/TERENCE
chmod +x deploy.sh
./deploy.sh
```

---

## Kiểm tra trang web

Sau khi deploy xong, truy cập:
- 🌐 **https://terence.com.vn** — Trang chủ
- 🔐 **https://terence.com.vn/login** — Đăng nhập

### Tài khoản đã seed:

| Email | Mật khẩu | Quyền |
|---|---|---|
| `admin@terence.vn` | `Admin@12345` | Super Admin |
| `staff@terence.vn` | `Staff@12345` | Staff |
| `user@terence.vn` | `User@12345` | User |

---

## Troubleshooting

### ❌ `prisma: command not found`
```bash
npx prisma generate
npx prisma migrate deploy
```

### ❌ Build lỗi "Module not found"
```bash
rm -rf node_modules .next
npm install
npm run build
```

### ❌ PM2 restart liên tục
```bash
pm2 logs terence --lines 50
# Xem lỗi cụ thể
```

### ❌ Trang web 502 Bad Gateway
```bash
# Kiểm tra app có chạy không
pm2 status
curl http://127.0.0.1:3000

# Kiểm tra Nginx config
nginx -t
systemctl reload nginx
```

### ❌ Logo vẫn hiện nền trắng (cache)
```bash
# Hard refresh trên browser: Ctrl+Shift+R
# Hoặc clear Cloudflare cache nếu dùng
```
