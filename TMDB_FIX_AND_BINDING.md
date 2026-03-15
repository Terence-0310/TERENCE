# 🔧 TMDB FIX & BINDING — Báo cáo audit và chuẩn hóa

> Ngày: 2026-03-15
> Mục tiêu: Chuẩn hóa tích hợp TMDB, không thay đổi giao diện

---

## 1. Kết quả Audit

### ✅ Kiến trúc hiện tại (đã tốt)

```
lib/tmdb/
  ├── config.ts      ← ENV config + image URL helpers
  ├── client.ts      ← HTTP fetch wrapper (server-side)
  ├── mapper.ts      ← Raw TMDB → App domain model
  └── index.ts       ← barrel export

services/tmdb/
  ├── movie-service.ts  ← list/detail/genre endpoints
  └── search-service.ts ← search endpoint

types/
  ├── movie.ts       ← App domain interfaces
  ├── tmdb.ts        ← Raw TMDB API response types
  └── index.ts       ← barrel export
```

### ⚠️ Vấn đề phát hiện & đã sửa

| #  | Vấn đề                                         | Mức      | Trạng thái |
|----|-------------------------------------------------|----------|------------|
| 1  | Không có request timeout                        | Nghiêm trọng | ✅ Fixed  |
| 2  | Error không phân loại (chỉ generic Error)       | Trung bình   | ✅ Fixed  |
| 3  | Log full URL chứa api_key                       | Bảo mật      | ✅ Fixed  |
| 4  | Env var name không chuẩn (`TMDB_ACCESS_TOKEN`)  | Convention   | ✅ Fixed  |
| 5  | `NEXT_PUBLIC_TMDB_BASE_URL` dùng cho server     | Convention   | ✅ Fixed  |
| 6  | Không warn khi thiếu credentials                | DX           | ✅ Fixed  |
| 7  | `getMovieDetail` crash nếu credits/videos fail  | Stability    | ✅ Fixed  |
| 8  | Code lặp `mapPaginated` trong movie-service     | Code quality | ✅ Fixed  |
| 9  | Fallback message hiển thị tên env cũ            | UI text      | ✅ Fixed  |
| 10 | `next.config.mjs` env mapping dùng tên cũ       | Config       | ✅ Fixed  |

---

## 2. Chuẩn hóa ENV Variables

### File: `.env` và `.env.example`

```env
# Server-only (KHÔNG prefix NEXT_PUBLIC_)
TMDB_API_KEY=                     # v3 API key
TMDB_READ_ACCESS_TOKEN=           # v4 Bearer token (ưu tiên)
TMDB_BASE_URL=https://api.themoviedb.org/3

# Public (cần cho client-side image URLs)
NEXT_PUBLIC_TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p
NEXT_PUBLIC_REGION=VN
```

**Thay đổi:**
- `TMDB_ACCESS_TOKEN` → `TMDB_READ_ACCESS_TOKEN` (rõ ràng hơn, đúng tên TMDB docs)
- `NEXT_PUBLIC_TMDB_BASE_URL` → `TMDB_BASE_URL` (server-only, không cần expose ra client)

---

## 3. File đã chỉnh

### `lib/tmdb/config.ts` — Config & env validation

| Thay đổi | Chi tiết |
|----------|----------|
| Env var names | `TMDB_ACCESS_TOKEN` → `TMDB_READ_ACCESS_TOKEN`, `NEXT_PUBLIC_TMDB_BASE_URL` → `TMDB_BASE_URL` |
| Startup warning | Thêm `console.warn` nếu thiếu cả `apiKey` và `accessToken` (chỉ server-side) |
| Safe logging | Warn message không bao gồm giá trị secret |

### `lib/tmdb/client.ts` — HTTP Client (viết lại)

| Feature | Chi tiết |
|---------|----------|
| **Timeout** | `AbortController` với default 10s, configurable per-request |
| **Error classes** | `TmdbApiError` (HTTP errors) + `TmdbTimeoutError` (timeout) |
| **Safe logging** | Chỉ log endpoint path, KHÔNG log full URL (chứa api_key) |
| **`tmdbFetchSafe()`** | Helper trả `null` thay vì throw — dùng cho optional data |
| **No secrets in logs** | Tất cả `console.error` chỉ ghi endpoint, không ghi query params |

### `lib/tmdb/index.ts` — Updated exports

| Thêm | `tmdbFetchSafe`, `TmdbApiError`, `TmdbTimeoutError` |
|------|------------------------------------------------------|

### `services/tmdb/movie-service.ts` — Chuẩn hóa

| Thay đổi | Chi tiết |
|----------|----------|
| `mapPaginated()` helper | Extract giảm code lặp (6 endpoints dùng chung) |
| `getMovieDetail()` | Credits, videos, similar dùng `tmdbFetchSafe` → page không crash nếu sub-request fail |
| Function signatures | **Giữ nguyên** — không ảnh hưởng UI binding |

### `next.config.mjs` — Env mapping

| Thay đổi | Chi tiết |
|----------|----------|
| `TMDB_ACCESS_TOKEN` | → `TMDB_READ_ACCESS_TOKEN` |
| Thêm | `TMDB_BASE_URL` mapping |

### `app/page.tsx` — Fallback message

| Dòng | Thay đổi |
|------|----------|
| 33 | `TMDB_ACCESS_TOKEN` → `TMDB_READ_ACCESS_TOKEN` trong code block hiển thị |

---

## 4. Danh sách hàm service đã chuẩn hóa

| Hàm                          | Endpoint                   | Revalidate | Error handling              |
|-------------------------------|----------------------------|------------|----------------------------|
| `getTrending(page?)`          | `/trending/movie/week`     | 30 min     | Throw → page catch         |
| `getPopular(page?)`           | `/movie/popular`           | 1 hour     | Throw → page catch         |
| `getTopRated(page?)`          | `/movie/top_rated`         | 1 hour     | Throw → page catch         |
| `getNowPlaying(page?)`        | `/movie/now_playing`       | 30 min     | Throw → page catch         |
| `getUpcoming(page?)`          | `/movie/upcoming`          | 1 hour     | Throw → page catch         |
| `getMovieDetail(id)`          | `/movie/{id}` + sub-reqs   | 1 hour     | Detail throws, extras safe  |
| `getMoviesByGenre(id, page?)` | `/discover/movie`          | 1 hour     | Throw → page catch         |
| `getGenres()`                 | `/genre/movie/list`        | 24 hours   | Throw → page catch         |
| `searchMovies(query, page?)`  | `/search/movie`            | 10 min     | Throw → page catch         |

---

## 5. Error / Fallback ở mỗi route

| Route            | Error strategy                                                    |
|------------------|------------------------------------------------------------------|
| `/` (Homepage)   | `try/catch` toàn bộ → hiển thị fallback "Cấu hình TMDB API key" |
| `/browse`        | Genres: `try/catch` → `[]`, Results: `try/catch` → empty result  |
| `/movie/[id]`    | `try/catch` → `notFound()` (Next.js 404 page)                   |
| `/watch/[id]`    | `try/catch` → `notFound()` (Next.js 404 page)                   |
| `/news`          | Static data (không dùng TMDB)                                     |
| `/reviews`       | Static data (không dùng TMDB)                                     |
| `/xem-chung`     | Dùng watch-party data (không dùng TMDB trực tiếp)                |

---

## 6. Xác nhận an toàn

| Kiểm tra                                    | Kết quả |
|---------------------------------------------|---------|
| Không hard-code API key/token trong source  | ✅ Confirmed (grep clean) |
| Không log secret values                     | ✅ Confirmed |
| Không thay đổi UI/JSX structure             | ✅ Confirmed |
| Không thay đổi component props/signatures   | ✅ Confirmed |
| `types/movie.ts` không đổi                  | ✅ Confirmed |
| `types/tmdb.ts` không đổi                   | ✅ Confirmed |
| `lib/tmdb/mapper.ts` không đổi              | ✅ Confirmed |
| `services/tmdb/search-service.ts` không đổi | ✅ Confirmed |
| Page-level error handling đã có sẵn         | ✅ Confirmed |

---

## 7. Lưu ý cho deploy

1. **Phải set env** trước khi build:
   ```bash
   TMDB_API_KEY=your_v3_key
   TMDB_READ_ACCESS_TOKEN=your_v4_token
   ```
   Chỉ cần **1 trong 2** — nếu có cả 2 sẽ dùng cả 2 (api_key trong query + Bearer token trong header).

2. **Kiểm tra nhanh** sau deploy:
   ```bash
   curl -s "https://api.themoviedb.org/3/movie/popular?api_key=YOUR_KEY&language=vi-VN" | head -c 200
   ```

3. **Không cần TMDB key cho phát triển local** — Homepage sẽ hiển thị fallback hướng dẫn cấu hình.
