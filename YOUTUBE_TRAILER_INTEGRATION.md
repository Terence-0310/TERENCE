# 🎬 YOUTUBE TRAILER INTEGRATION — Báo cáo tích hợp

> Ngày: 2026-03-15
> Mục tiêu: Tích hợp trailer YouTube từ TMDB, không đổi UI/UX gốc

---

## 1. Luồng dữ liệu trailer

```
TMDB API /movie/{id}/videos
    ↓
tmdbFetch (server-side, language=en-US)
    ↓
mapVideo() — convert raw → VideoItem
    ↓
mapMovieDetail() — chọn trailer ưu tiên
    ↓
movie.trailer: VideoItem | null
    ↓
UI components render (nếu trailer !== null)
```

---

## 2. Logic chọn trailer (ĐÃ CẬP NHẬT)

**File:** `lib/tmdb/mapper.ts` → `mapMovieDetail()`

### Thứ tự ưu tiên:

| Ưu tiên | Điều kiện                              | Ví dụ                           |
|---------|---------------------------------------|---------------------------------|
| 1       | `site === 'YouTube' && type === 'Trailer'` | Official Trailer               |
| 2       | `site === 'YouTube' && type === 'Teaser'`  | Official Teaser                |
| 3       | `site === 'YouTube'` (bất kỳ type nào)    | Behind the Scenes, Featurette  |
| 4       | Không có YouTube video → `null`           | Ẩn nút trailer hoàn toàn       |

### Code:

```typescript
const youtubeVideos = mappedVideos.filter(v => v.site === 'YouTube')
const trailer =
  youtubeVideos.find(v => v.type === 'Trailer') ||
  youtubeVideos.find(v => v.type === 'Teaser') ||
  youtubeVideos[0] ||
  null
```

---

## 3. VideoItem trả về

**File:** `types/movie.ts`

| Field        | Type    | Ví dụ                                                        |
|-------------|---------|--------------------------------------------------------------|
| `id`         | string  | `"5c9294240e0a267cd516835f"`                                 |
| `key`        | string  | `"dQw4w9WgXcQ"`                                              |
| `name`       | string  | `"Official Trailer"`                                         |
| `site`       | string  | `"YouTube"`                                                  |
| `type`       | string  | `"Trailer"` / `"Teaser"` / etc.                             |
| `isTrailer`  | boolean | `true` nếu Trailer hoặc Teaser trên YouTube                 |
| `youtubeUrl` | string  | `https://www.youtube.com/watch?v=dQw4w9WgXcQ`               |
| `embedUrl`   | string  | `https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1` |

**Thay đổi:** Thêm `embedUrl` (mới) — tập trung URL embed ở mapper, không construct inline trong component.

---

## 4. Nơi trailer được sử dụng trong UI

### 4.1 Trang chi tiết phim (`/movie/[id]`)

**File:** `app/movie/[id]/page.tsx`

| Vị trí | Cách hiển thị | Khi không có trailer |
|--------|---------------|---------------------|
| **Action buttons** (dòng 168-178) | Nút "Trailer" với icon ExternalLink, mở tab mới YouTube | Ẩn nút, "Xem phim" tự chiếm đủ space → **không xô layout** |
| **Trailer section** (dòng 208-226) | Embedded YouTube iframe `aspect-video`, lazy loading | Toàn bộ section bị ẩn → **không xô layout** |

### 4.2 Trang xem phim (`/watch/[id]`)

**File:** `app/watch/[id]/page.tsx`

| Vị trí | Cách hiển thị | Khi không có trailer |
|--------|---------------|---------------------|
| **Player area** (dòng 53-61) | Embedded iframe autoplay (nếu có trailer) | Hiện placeholder "Nguồn phát chưa khả dụng" → **không xô layout** |
| **Fallback CTA** (dòng 88-98) | Nút "Xem Trailer trên YouTube" khi không có HLS source | Ẩn nút → placeholder vẫn hiển thị bình thường |

### 4.3 Hero Banner (Homepage)

**File:** `components/home/HeroBanner.tsx`

**Không thêm nút trailer** — HeroBanner dùng data từ list endpoints (trending, popular...) mà không gọi `/videos`. Thêm trailer vào hero sẽ cần N API calls bổ sung cho mỗi movie trong carousel, gây chậm page. Hiện tại hero đã có nút "Xem ngay" + "Chi tiết" — phù hợp flow UX.

---

## 5. File đã chỉnh

| File | Thay đổi | UI structure đổi? |
|------|----------|-------------------|
| `types/movie.ts` | Thêm `embedUrl: string` vào `VideoItem` | ❌ Không |
| `lib/tmdb/mapper.ts` | Cải thiện trailer selection: Trailer → Teaser → any YouTube. Thêm `embedUrl` vào `mapVideo()`. | ❌ Không |
| `app/movie/[id]/page.tsx` | Dùng `movie.trailer.embedUrl` thay vì inline construct | ❌ Không |
| `app/watch/[id]/page.tsx` | Dùng `movie.trailer.embedUrl` thay vì inline construct | ❌ Không |

---

## 6. Xác nhận an toàn

| Kiểm tra | Kết quả |
|----------|---------|
| Movie detail page layout | ✅ Giữ nguyên |
| Watch page layout | ✅ Giữ nguyên |
| Hero banner layout | ✅ Giữ nguyên (không thêm trailer) |
| Khi trailer = null | ✅ Nút/section ẩn hợp lý, không xô layout |
| Không hard-code YouTube URL trong component | ✅ Tất cả dùng `embedUrl` từ mapper |
| Teaser fallback hoạt động | ✅ Nếu không có Trailer, tự chọn Teaser |
| Non-YouTube video không bị chọn | ✅ Filter `site === 'YouTube'` trước |
