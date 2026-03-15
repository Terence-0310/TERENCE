# 📺 EPISODE LIST INTEGRATION — Phim bộ

> Ngày: 2026-03-15
> Mục tiêu: Thêm danh sách tập cho phim bộ, giữ nguyên giao diện gốc

---

## 1. Kiến trúc

```
TMDB API                        Provider System
   │                                  │
   ├── /tv/{id} → SeriesDetail        ├── DemoVideoProvider
   │      └── seasons[]               │      └── episodes[]
   │                                  │
   ├── /tv/{id}/season/{n}            └── (future providers)
   │      └── episodes[]
   │
   ▼                                  ▼
SeriesDetail                    MovieSourceResult
   └── Season[]                      └── Episode[]
           └── SeasonDetail
                  └── SeriesEpisode[]
                         │
                         ▼
               EpisodeListBar Component
               (watch page, between player & info)
```

---

## 2. Files mới

| File | Vai trò |
|------|---------|
| `types/series.ts` | Types: TMDB raw (TmdbTvShow, TmdbTvDetail, TmdbSeason, TmdbSeasonDetail, TmdbEpisode) + App domain (Series, SeriesDetail, Season, SeasonDetail, SeriesEpisode) |
| `services/tmdb/tv-service.ts` | TMDB TV endpoints: getTvPopular, getTvTrending, getTvTopRated, getTvDetail, getSeasonDetail, searchTv |
| `components/watch/EpisodeListBar.tsx` | Client component: episode chips + season selector + prev/next |

## 3. Files sửa

| File | Thay đổi |
|------|----------|
| `app/watch/[id]/page.tsx` | Thay inline episode list bằng EpisodeListBar component |

---

## 4. Types

### `types/series.ts`

```typescript
// App domain
interface Series {
  id, title, originalTitle, overview, posterUrl, backdropUrl,
  firstAirDate, year, voteAverage, voteCount, popularity,
  genreIds, mediaType: 'tv'
}

interface SeriesDetail extends Series {
  tagline, status, numberOfSeasons, numberOfEpisodes,
  inProduction, seasons: Season[], creators[]
}

interface Season {
  id, seasonNumber, name, overview, posterUrl, airDate, episodeCount
}

interface SeasonDetail extends Season {
  episodes: SeriesEpisode[]
}

interface SeriesEpisode {
  id, episodeNumber, seasonNumber, title, overview,
  stillUrl, airDate, voteAverage, runtime, runtimeFormatted,
  slug  // "s1-ep3"
}
```

---

## 5. TV Service (`services/tmdb/tv-service.ts`)

| Function | Endpoint | Mô tả |
|----------|----------|-------|
| `getTvPopular(page)` | `/tv/popular` | Phim bộ phổ biến |
| `getTvTrending(page)` | `/trending/tv/week` | Xu hướng tuần |
| `getTvTopRated(page)` | `/tv/top_rated` | Đánh giá cao |
| `getTvDetail(id)` | `/tv/{id}` | Chi tiết + seasons list |
| `getSeasonDetail(tvId, season)` | `/tv/{id}/season/{n}` | Episodes trong season |
| `searchTv(query, page)` | `/search/tv` | Tìm kiếm phim bộ |

---

## 6. EpisodeListBar (`components/watch/EpisodeListBar.tsx`)

### Props

| Prop | Type | Mô tả |
|------|------|-------|
| `providerEpisodes` | `Episode[]?` | Episodes từ provider system (demo) |
| `seriesEpisodes` | `SeriesEpisode[]?` | Episodes từ TMDB (ưu tiên) |
| `seasons` | `Season[]?` | Season list (cho selector) |
| `currentEpisodeSlug` | `string?` | Slug tập đang xem |
| `watchUrl` | `string` | Base URL, e.g. "/watch/12345" |
| `activeSeason` | `number?` | Season đang chọn |

### Features

| Feature | Chi tiết |
|---------|---------|
| **Episode chips** | Grid chips, highlight tập đang xem (primary color + ▶ icon) |
| **Prev/Next** | Nút "Tập trước" / "Tập sau" (disabled style ở đầu/cuối) |
| **Season selector** | Tabs S1, S2... (chỉ hiện khi > 1 season) |
| **Duration display** | Clock icon + runtime (nếu có) |
| **Single season** | Không hiện season selector — UX đơn giản |
| **No episodes** | Component trả null — không render gì |
| **TMDB preferred** | Nếu có seriesEpisodes thì dùng, fallback providerEpisodes |

### URL schema

```
/watch/{id}?ep=s1-ep3              ← xem tập 3 season 1
/watch/{id}?ep=s1-ep3&season=1     ← explicitly season 1
/watch/{id}?ep=tap-2               ← provider episode format
```

---

## 7. Watch page integration

### Vị trí: giữa PLAYER AREA và INFO BAR (không đổi layout)

```tsx
{/* ═══════ PLAYER AREA ═══════ */}
<section>...</section>

{/* ═══════ EPISODE LIST ═══════ */}  ← EpisodeListBar ở đây
{source.episodes.length > 0 && (
  <EpisodeListBar
    providerEpisodes={source.episodes}
    currentEpisodeSlug={episodeSlug}
    watchUrl={`/watch/${movie.id}`}
  />
)}

{/* ═══════ INFO BAR ═══════ */}
<section>...</section>
```

---

## 8. Data flow — 2 nguồn episode

### Source 1: Provider system (hiện tại)
```
DemoVideoProvider.getEpisodes(movie) → Episode[]
    ↓
resolveMovieSource() → MovieSourceResult.episodes
    ↓
<EpisodeListBar providerEpisodes={source.episodes} />
```

### Source 2: TMDB TV (mở rộng tương lai)
```
getTvDetail(id) → SeriesDetail.seasons
    ↓
getSeasonDetail(id, seasonNumber) → SeasonDetail.episodes
    ↓
<EpisodeListBar seriesEpisodes={seasonDetail.episodes} seasons={series.seasons} />
```

**Ưu tiên**: TMDB series data (richer — có stillUrl, airDate, voteAverage, overview)

---

## 9. Fallback behavior

| Trường hợp | Hành vi |
|------------|---------|
| Không có episodes | EpisodeListBar trả `null` — không render |
| 1 season | Không hiện season selector |
| Thiếu duration | Ẩn clock icon |
| Thiếu stillUrl | — (chip mode không dùng ảnh) |
| Tập đang xem | Highlight primary + ▶ icon |
| Tập đầu tiên | "Tập trước" disabled |
| Tập cuối | "Tập sau" disabled |

---

## 10. Xác nhận an toàn

| Kiểm tra | Kết quả |
|----------|---------|
| Watch page layout giữ nguyên | ✅ |
| EpisodeListBar chỉ ở giữa player và info | ✅ |
| Không episodes → không render | ✅ |
| Single season → không selector | ✅ |
| Không ảnh hưởng movie (non-series) pages | ✅ |
| `/series` route vẫn redirect `/browse` (chưa đổi) | ✅ |
| TV service sẵn sàng cho trang series tương lai | ✅ |
| Types tách riêng `types/series.ts` | ✅ |
