# 🔄 TMDB KEY ROTATION NOTE

> Ngày: 2026-03-15

---

## Khi nào cần rotate?

1. **Key bị lộ ra public** (commit vào git, paste lên Discord/chat...)
2. **Member rời team** — rotate ngay để revoke access
3. **Định kỳ** (khuyến nghị mỗi 90 ngày cho production)

---

## Cách rotate TMDB API Key

### Bước 1: Tạo key mới
1. Đăng nhập [TMDB Account Settings](https://www.themoviedb.org/settings/api)
2. Click "Generate New API Key" (hoặc "Create" nếu là token v4)
3. Copy key mới — **KHÔNG** xóa key cũ ngay

### Bước 2: Cập nhật env
```bash
# .env.local (local dev)
TMDB_API_KEY=new_key_here

# Production server — cập nhật trực tiếp hoặc qua CI/CD
```

### Bước 3: Deploy + verify
1. Restart dev server: `npm run dev`
2. Kiểm tra homepage load dữ liệu TMDB bình thường
3. Kiểm tra `/movie/550` (test detail page)
4. Kiểm tra `/browse?q=batman` (test search)

### Bước 4: Revoke key cũ
1. Vào TMDB Settings → API → Delete old key
2. Xác nhận app chạy bình thường với key mới

---

## API Key vs Read Access Token (v4)

| | API Key (v3) | Read Access Token (v4) |
|--|---|---|
| Format | 32-char hex | Long JWT-like string |
| Auth method | `?api_key=XXX` (URL param) | `Authorization: Bearer XXX` (header) |
| Security | Key visible trong URL | Key trong header — an toàn hơn |
| Khuyến nghị | ❌ Legacy | ✅ Dùng v4 nếu có thể |

### Khuyến nghị:
- Ưu tiên dùng `TMDB_READ_ACCESS_TOKEN` (v4 bearer)
- `tmdbFetch()` trong project hỗ trợ cả 2:
  - Nếu có `accessToken` → dùng header `Authorization: Bearer`
  - Nếu chỉ có `apiKey` → dùng URL param `?api_key=`

---

## Lưu ý cho team

- **KHÔNG** paste key vào Zalo/Discord/email
- **KHÔNG** commit `.env.local` vào git (đã gitignore)
- **KHÔNG** ghi key vào markdown docs
- Dùng `.env.example` để share template (chỉ placeholder)
- Mỗi dev nên tạo TMDB account riêng để có key riêng
- Production key tách biệt khỏi development key
