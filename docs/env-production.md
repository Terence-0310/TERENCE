# 🌍 Environment Variables — Production Guide

## Phân loại biến

### 🔒 Server-only (KHÔNG bao giờ gửi tới browser)

| Biến | Mô tả | Ví dụ |
|------|--------|-------|
| `NODE_ENV` | Môi trường chạy | `production` |
| `PORT` | Port nội bộ app | `3000` |
| `TMDB_API_KEY` | API key v3 từ TMDB | `a1b2c3d4...` |
| `TMDB_READ_ACCESS_TOKEN` | Bearer token v4 từ TMDB | `eyJhbGciOi...` |

> Các biến này chỉ tồn tại trên server, không bao giờ xuất hiện trong JavaScript gửi tới browser.

### 🌐 Public (embedded trong client JS tại build time)

| Biến | Mô tả | Giá trị production |
|------|--------|-------------------|
| `NEXT_PUBLIC_SITE_URL` | URL công khai | `https://terence.com.vn` |
| `NEXT_PUBLIC_TMDB_BASE_URL` | TMDB API endpoint | `https://api.themoviedb.org/3` |
| `NEXT_PUBLIC_TMDB_IMAGE_BASE_URL` | TMDB image CDN | `https://image.tmdb.org/t/p` |
| `NEXT_PUBLIC_REGION` | Region cho TMDB | `VN` |

> ⚠️ Biến `NEXT_PUBLIC_*` được nhúng vào client JS **tại thời điểm build**. Nếu thay đổi, **PHẢI build lại** (`npm run build`).

## Lưu ý bảo mật

- **KHÔNG** commit file `.env` lên Git (đã có trong `.gitignore`)
- **CHỈ** commit `.env.example` (template không có giá trị thật)
- Trên server, file `.env` nằm tại `/var/www/TERENCE/.env`
- TMDB API key miễn phí, nhưng vẫn là credential → đừng expose
