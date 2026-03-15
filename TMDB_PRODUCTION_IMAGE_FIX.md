# 🖼️ TMDB Production Image Fix

> **Date**: 2026-03-15  
> **Status**: ✅ FIXED  
> **Scope**: Image loading on production (poster, backdrop, card, hero, profile)

---

## Vấn đề

Poster / backdrop / profile images **không hiển thị trên production**, dù text phim hiện bình thường.

### Nguyên nhân gốc

`poster_path` trả về từ TMDB API đã chứa dấu `/` ở đầu:

```
poster_path = "/kqjL17yufvn9OVLyXYpvtyrFfak.jpg"
```

URL đúng phải là:
```
https://image.tmdb.org/t/p/w500/kqjL17yufvn9OVLyXYpvtyrFfak.jpg
```

Lỗi cũ: base URL từ env chứa sẵn `/original`, hoặc code nối sai cách → URL 404.

---

## Giải pháp

### 1. Tạo helper duy nhất: `lib/tmdb-image.ts`

```typescript
export function tmdbImage(path: string | null, size = "w500") {
  if (!path) return "/placeholder.jpg"
  return `https://image.tmdb.org/t/p/${size}${path}`
}
```

- Base hardcoded: `https://image.tmdb.org/t/p`
- Size nối riêng: `w300`, `w500`, `w780`, `w1280`, `original`
- Không phụ thuộc env cho image URL
- Nếu `path` null → trả `/placeholder.jpg`

### 2. Đã sử dụng helper ở tất cả nơi

| File | Trước | Sau |
|------|-------|-----|
| `lib/tmdb/mapper.ts` | `tmdbPosterUrl(raw.poster_path)` | `tmdbImage(raw.poster_path, 'w500')` |
| `lib/tmdb/mapper.ts` | `tmdbBackdropUrl(raw.backdrop_path)` | `tmdbImage(raw.backdrop_path, 'w1280')` |
| `lib/tmdb/mapper.ts` | `tmdbProfileUrl(raw.profile_path)` | `tmdbImage(raw.profile_path, 'w185')` |
| `services/tmdb/tv-service.ts` | tương tự | `tmdbImage(path, size)` |

### 3. Không có code sửa đổi poster_path

- ❌ KHÔNG `.replace("/")`
- ❌ KHÔNG `.slice(1)`
- ✅ Pass thẳng `poster_path` vào `tmdbImage()`

### 4. Giao diện giữ nguyên

Components vẫn dùng `movie.posterUrl`, `movie.backdropUrl` — giá trị đã được map đúng từ mapper.

### 5. next/image đã cho phép `image.tmdb.org`

```javascript
// next.config.mjs
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'image.tmdb.org' },
  ],
}
```

---

## Luồng dữ liệu

```
TMDB API → poster_path: "/abc.jpg"
         ↓
mapper.ts → tmdbImage("/abc.jpg", "w500")
         ↓
         → "https://image.tmdb.org/t/p/w500/abc.jpg"
         ↓
Component → <Image src={movie.posterUrl} />
```

---

## Files thay đổi

| File | Thay đổi |
|------|---------|
| `lib/tmdb-image.ts` | **MỚI** — helper duy nhất |
| `lib/tmdb/config.ts` | Delegate sang `tmdbImage`, giữ backward compat |
| `lib/tmdb/index.ts` | Export `tmdbImage` |
| `lib/tmdb/mapper.ts` | Dùng `tmdbImage` thay vì wrapper cũ |
| `services/tmdb/tv-service.ts` | Dùng `tmdbImage` thay vì wrapper cũ |
