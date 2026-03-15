# 📡 TMDB ROUTE BINDING — Báo cáo audit & trạng thái binding

> Ngày: 2026-03-15
> Mục tiêu: Xác nhận tất cả public routes đã bind dữ liệu TMDB thật, không còn mock data

---

## 1. Tổng quan hệ thống route

```
app/
├── page.tsx              ← / (Homepage)
├── browse/page.tsx       ← /browse (Khám phá + tìm kiếm + filter)
├── movie/[id]/page.tsx   ← /movie/:id (Chi tiết phim)
├── movie/page.tsx        ← /movie → redirect /browse
├── movies/page.tsx       ← /movies → redirect /browse
├── series/page.tsx       ← /series → redirect /browse
├── genres/page.tsx       ← /genres → redirect /browse
├── watch/[id]/page.tsx   ← /watch/:id (Xem phim)
├── watch/page.tsx        ← /watch → redirect /
├── news/page.tsx         ← /news (Tin tức — editorial)
├── reviews/page.tsx      ← /reviews (Review — editorial)
├── xem-chung/page.tsx    ← /xem-chung (Watch party)
├── login/page.tsx        ← /login (Auth)
├── signup/page.tsx       ← /signup (Auth)
└── dashboard/            ← Admin panel (separate scope)
```

---

## 2. Trạng thái binding từng route

### ✅ Routes đã bind TMDB đầy đủ

#### `/` — Homepage

| Section | Data source | Service function |
|---------|------------|------------------|
| Hero Banner (carousel 6 phim) | TMDB trending/week | `getTrending()` |
| "Xu hướng tuần này" row | TMDB trending/week | `getTrending()` |
| "Phim phổ biến" row | TMDB popular | `getPopular()` |
| Genre chips | TMDB genre list | `getGenres()` |
| "Đánh giá cao nhất" row | TMDB top_rated | `getTopRated()` |
| "Đang chiếu rạp" row | TMDB now_playing | `getNowPlaying()` |
| "Sắp ra mắt" row | TMDB upcoming | `getUpcoming()` |

**Error handling:** `try/catch` toàn bộ → hiển thị fallback UI hướng dẫn cấu hình API key.

#### `/browse` — Khám phá / Tìm kiếm / Filter

| Feature | Data source | Service function |
|---------|------------|------------------|
| Search `?q=...` | TMDB search/movie | `searchMovies(query, page)` |
| Filter theo genre `?genre=...` | TMDB discover/movie | `getMoviesByGenre(genreId, page)` |
| Category `?category=trending` | TMDB trending/week | `getTrending(page)` |
| Category `?category=top-rated` | TMDB movie/top_rated | `getTopRated(page)` |
| Category `?category=now-playing` | TMDB movie/now_playing | `getNowPlaying(page)` |
| Category `?category=upcoming` | TMDB movie/upcoming | `getUpcoming(page)` |
| Default (không param) | TMDB movie/popular | `getPopular(page)` |
| Genre chip list | TMDB genre/movie/list | `getGenres()` |
| Pagination | ✅ Server-side, page params | `buildPageUrl(p)` |

**Error handling:** Genres `try/catch → []`, Results `try/catch → empty result`.

#### `/movie/[id]` — Chi tiết phim

| Field | Data source | Được map? |
|-------|------------|-----------|
| Title, original title | `movie.title`, `movie.originalTitle` | ✅ |
| Overview | `movie.overview` | ✅ |
| Rating (⭐) | `movie.voteAverage`, `movie.voteCount` | ✅ |
| Year | `movie.year` | ✅ |
| Runtime | `movie.runtimeFormatted` | ✅ |
| Status | `movie.status` | ✅ |
| Tagline | `movie.tagline` | ✅ |
| Genres (link /browse?genre=) | `movie.genres` | ✅ |
| Poster | `movie.posterUrl` → fallback `/placeholder.jpg` | ✅ |
| Backdrop | `movie.backdropUrl` → fallback gradient | ✅ |
| Director | `movie.crew.find(c => c.job === 'Director')` | ✅ |
| Cast (grid) | `movie.cast.slice(0, 16)` with profileUrl | ✅ |
| Trailer nút CTA | `movie.trailer.youtubeUrl` | ✅ (ẩn nếu null) |
| Trailer embed | `movie.trailer.embedUrl` | ✅ (ẩn nếu null) |
| Related movies | `movie.relatedMovies` → MovieRow | ✅ |

**Error handling:** `try/catch → notFound()`.

#### `/watch/[id]` — Xem phim

| Feature | Data source |
|---------|------------|
| Trailer embed (autoplay) | `movie.trailer.embedUrl` |
| Fallback (no trailer) | Placeholder UI "Nguồn phát chưa khả dụng" |
| Movie info sidebar | `movie.title`, `movie.year`, `movie.runtimeFormatted`, `movie.genres`, `movie.cast`, `movie.overview` |
| Related movies | `movie.relatedMovies` → MovieRow |

**Error handling:** `try/catch → notFound()`.

---

### ↩️ Routes redirect (không cần binding)

| Route | Redirect đến | Lý do |
|-------|-------------|-------|
| `/movies` | `/browse` | Alias path |
| `/series` | `/browse` | Alias path (TV series chưa tách riêng) |
| `/genres` | `/browse` | Genres được filter trong browse |
| `/movie` (không id) | `/browse` | Cần id cụ thể |
| `/watch` (không id) | `/` | Cần id cụ thể |

---

### 📝 Routes dùng static/editorial data (hợp lý)

| Route | Loại data | Lý do không dùng TMDB |
|-------|----------|----------------------|
| `/news` | Hard-coded NEWS array | Nội dung biên soạn thủ công, không phải movie data |
| `/reviews` | Hard-coded REVIEWS array | Nội dung biên soạn thủ công, không phải movie data |

---

### 🌐 Routes không liên quan TMDB

| Route | Mục đích |
|-------|----------|
| `/xem-chung` | Watch party rooms (dùng watch-party service) |
| `/login`, `/signup` | Authentication |
| `/dashboard/*` | Admin panel (scope riêng, dùng mock data cho prototype) |

---

## 3. Component binding

### Components nhận Movie data từ TMDB

| Component | Props | Fields used | Fallback |
|-----------|-------|-------------|----------|
| `HeroBanner` | `movies: Movie[]` | `id, title, overview, backdropUrl, voteAverage, year` | Hiển thị text mặc định nếu overview rỗng |
| `MovieCard` | `movie: Movie` | `id, title, posterUrl, voteAverage, year, runtimeFormatted` | `/placeholder.jpg` nếu posterUrl null |
| `MovieRow` | `movies: Movie[]` | Renders MovieCard cho mỗi movie | Skeleton loading state |
| `GenreChips` | `genres: Genre[]` | `id, name` | Ẩn nếu mảng rỗng |
| `SearchBar` | `defaultValue: string` | — | — |

### Chỗ nào render ảnh thiếu / field thiếu?

| Field | Fallback logic | Vị trí |
|-------|---------------|--------|
| `posterUrl = null` | → `/placeholder.jpg` (mapper config) | `tmdbPosterUrl()` in `lib/tmdb/config.ts` |
| `backdropUrl = null` | → `/placeholder.jpg` hoặc gradient background | `tmdbBackdropUrl()` + component check |
| `profileUrl = null` | → `/placeholder-user.jpg` (inline in component) | `movie/[id]/page.tsx` cast grid |
| `overview = ''` | → "Khám phá bộ phim hấp dẫn này" (HeroBanner) | `HeroBanner.tsx:97` |
| `voteAverage = 0` | → Ẩn badge | `MovieCard.tsx:30`, `HeroBanner.tsx:77` |
| `year = 0` | → Ẩn năm | `MovieCard.tsx:65`, `HeroBanner.tsx:83` |
| `runtimeFormatted = ''` | → Ẩn thời lượng | `MovieCard.tsx:54` |
| `trailer = null` | → Ẩn nút + section trailer | `movie/[id]/page.tsx:168,209` |
| `genres = []` | → Ẩn genre chips | `movie/[id]/page.tsx:145` |
| `cast = []` | → Ẩn cast grid | `movie/[id]/page.tsx:229` |
| `relatedMovies = []` | → Ẩn section phim tương tự | `movie/[id]/page.tsx:254` |

---

## 4. Search flow

```
User types in SearchBar (Header hoặc /browse)
    ↓
Navigate: /browse?q=...
    ↓
BrowsePage reads searchParams.q
    ↓
searchMovies(query, page) → TMDB /search/movie
    ↓
Results mapped → Movie[] → MovieCard grid
    ↓
Empty? → "Không tìm thấy kết quả" UI
```

---

## 5. Xác nhận không hard-code movie data

| Kiểm tra | Kết quả |
|----------|---------|
| Không hard-code movie data trong public pages | ✅ |
| Tất cả movie data đến từ TMDB services | ✅ |
| Không import từ file JSON/mock trong public routes | ✅ |
| Components dùng `Movie` type interface, không inline object | ✅ |
| Pagination server-side qua URL params | ✅ |
| Genre filter server-side qua URL params | ✅ |
| Search server-side qua URL params | ✅ |
| Ảnh thiếu → fallback an toàn, không vỡ layout | ✅ |
| Field thiếu → ẩn/skip, không render undefined | ✅ |

---

## 6. Kết luận

**Tất cả public-facing movie routes đã hoàn toàn bind dữ liệu TMDB thật:**

- ✅ `/` — Trending, Popular, Top Rated, Now Playing, Upcoming, Genres
- ✅ `/browse` — Search, Filter genre, Category browse, Pagination
- ✅ `/movie/[id]` — Full detail + cast + trailer + related
- ✅ `/watch/[id]` — Trailer embed + movie info
- ✅ `/movies`, `/series`, `/genres` — Redirect → `/browse`

**Không cần chỉnh sửa thêm** — hệ thống TMDB binding đã hoàn chỉnh.
