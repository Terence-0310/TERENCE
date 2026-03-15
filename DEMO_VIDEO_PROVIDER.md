# 🎬 DEMO VIDEO PROVIDER — Kiến trúc nguồn phim tách lớp

> Ngày: 2026-03-15
> Mục tiêu: Tích hợp nguồn phim demo qua provider pattern, giữ nguyên UI gốc

---

## 1. Kiến trúc tổng quan

```
┌────────────────────────────────┐
│     Watch Page (UI Layer)      │ ← Không biết source đến từ đâu
│     app/watch/[id]/page.tsx    │
└────────────┬───────────────────┘
             │ resolveMovieSource(movie)
             ▼
┌────────────────────────────────┐
│   Video Source Resolver        │ ← Chọn provider tốt nhất
│   services/video-source/       │
│   resolver.ts                  │
└────────────┬───────────────────┘
             │ iterate by priority
             ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ DemoVideoProvider│  │ (Future: OPhim)  │  │ TmdbTrailer      │
│ priority: 10     │  │ priority: 20     │  │ priority: 99     │
│ mp4/youtube/hls  │  │ iframe/hls       │  │ youtube fallback  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 2. File structure

```
services/video-source/
├── index.ts                 ← barrel export
├── provider.ts              ← VideoSourceProvider interface
├── resolver.ts              ← resolveMovieSource() — picks best provider
├── demo-video-provider.ts   ← Demo catalog (TMDB ID → video URL)
└── tmdb-trailer-provider.ts ← YouTube trailer fallback
```

---

## 3. Provider interface

**File:** `services/video-source/provider.ts`

```typescript
interface VideoSourceProvider {
  readonly name: string
  readonly priority: number  // lower = checked first

  hasSource(movie: MovieDetail): Promise<boolean>
  getPlayback(movie: MovieDetail, episodeSlug?: string): Promise<PlaybackSource | null>
  getEpisodes(movie: MovieDetail): Promise<Episode[]>
  getSourceType(movie: MovieDetail): SourceType
}
```

---

## 4. Provider registry

| Provider | Priority | Source type | Khi nào dùng |
|----------|----------|------------|-------------|
| `DemoVideoProvider` | 10 | mp4, youtube, iframe | TMDB ID có trong DEMO_CATALOG |
| *(slot cho provider mới)* | 20-89 | — | Thêm sau (ophim, kkphim...) |
| `TmdbTrailerProvider` | 99 | youtube | Fallback — dùng trailer embed từ TMDB |

**Resolver logic:**
1. Iterate providers theo thứ tự priority (thấp → cao)
2. Gọi `hasSource()` trên mỗi provider
3. Provider đầu tiên trả `true` → dùng nó
4. Không provider nào match → trả `available: false`

---

## 5. Abstraction functions

| Function | Mô tả | Return type |
|----------|-------|-------------|
| `resolveMovieSource(movie, ep?)` | Tìm source tốt nhất cho movie | `MovieSourceResult` |
| `provider.hasSource(movie)` | Kiểm tra provider có source | `boolean` |
| `provider.getPlayback(movie, ep?)` | Lấy URL phát | `PlaybackSource \| null` |
| `provider.getEpisodes(movie)` | Lấy danh sách tập | `Episode[]` |
| `provider.getSourceType(movie)` | Loại source | `SourceType` |

---

## 6. Data types bổ sung

**File:** `types/movie.ts`

```typescript
type SourceType = 'youtube' | 'mp4' | 'hls' | 'iframe' | 'none'

interface Episode {
  id: string
  number: number
  title: string
  slug: string
  duration?: string
}

interface PlaybackSource {
  url: string
  type: SourceType
  quality?: string
  label?: string
  subtitles?: SubtitleTrack[]
}

interface MovieSourceResult {
  available: boolean
  sourceType: SourceType
  providerName: string
  playback: PlaybackSource | null
  episodes: Episode[]
}
```

---

## 7. Cách thêm demo video cho một phim

**File:** `services/video-source/demo-video-provider.ts`

### 7.1 Thêm bằng TMDB ID

```typescript
const DEMO_CATALOG = {
  // TMDB ID 550 = Fight Club
  550: {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    type: 'mp4' as const,
    label: 'Demo 720p',
  },
}
```

### 7.2 Thêm với danh sách tập (series)

```typescript
const DEMO_CATALOG = {
  12345: {
    url: 'https://example.com/ep1.mp4',
    type: 'mp4' as const,
    label: 'Tập 1',
    episodes: [
      { title: 'Tập 1: Khởi đầu', url: 'https://example.com/ep1.mp4', duration: '24:00' },
      { title: 'Tập 2: Phát triển', url: 'https://example.com/ep2.mp4', duration: '23:30' },
    ],
  },
}
```

### 7.3 Thêm YouTube embed

```typescript
const DEMO_CATALOG = {
  456: {
    url: 'https://www.youtube.com/embed/VIDEO_ID?rel=0&modestbranding=1',
    type: 'youtube' as const,
    label: 'Demo YouTube',
  },
}
```

---

## 8. Watch page — thay đổi

### Trước (hard-code trailer logic):
```typescript
{movie.trailer ? (
  <iframe src={movie.trailer.embedUrl} ... />
) : (
  <div>Nguồn phát chưa khả dụng</div>
)}
```

### Sau (provider-based):
```typescript
const source = await resolveMovieSource(movie, episodeSlug)

{source.available && source.playback ? (
  // Render đúng loại: youtube/mp4/hls/iframe
) : (
  <div>Đang cập nhật nguồn phát</div>
)}
```

### Những gì giữ nguyên:
- ✅ Layout tổng thể (player + info bar + related)
- ✅ Back navigation
- ✅ Info bar (title, rating, year, genres, credits)
- ✅ Action buttons (chi tiết, yêu thích, chia sẻ, xem chung)
- ✅ Related movies section
- ✅ All className/styling

### Những gì thêm:
- ✅ Episode list section (chỉ hiện khi source có episodes)
- ✅ Provider badge nhỏ trong info bar
- ✅ Player tự render đúng loại source
- ✅ Text "Đang cập nhật nguồn phát" thay vì "Nguồn phát chưa khả dụng"

---

## 9. Cách thêm provider mới trong tương lai

```typescript
// services/video-source/ophim-provider.ts
export class OPhimProvider implements VideoSourceProvider {
  readonly name = 'ophim'
  readonly priority = 20  // giữa demo(10) và trailer(99)

  async hasSource(movie: MovieDetail) { /* ... */ }
  async getPlayback(movie: MovieDetail, ep?: string) { /* ... */ }
  async getEpisodes(movie: MovieDetail) { /* ... */ }
  getSourceType() { return 'iframe' as const }
}

// Sau đó thêm vào resolver.ts:
import { OPhimProvider } from './ophim-provider'

const providers = [
  new DemoVideoProvider(),   // 10
  new OPhimProvider(),       // 20
  new TmdbTrailerProvider(), // 99
].sort((a, b) => a.priority - b.priority)
```

---

## 10. Xác nhận an toàn

| Kiểm tra | Kết quả |
|----------|---------|
| Watch page layout giữ nguyên | ✅ |
| Không hard-code source trong JSX | ✅ |
| Provider logic tách khỏi component | ✅ |
| Không source → "Đang cập nhật nguồn phát" | ✅ |
| Episode list chỉ hiện khi có data | ✅ |
| TMDB trailer vẫn hoạt động như fallback | ✅ |
| Có thể mở rộng thêm provider mới | ✅ |
| Không ảnh hưởng các route khác | ✅ |
