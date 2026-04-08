# 📊 ĐÁNH GIÁ CHI TIẾT CÁC CHỨC NĂNG — TERENCE Platform

> **Dự án:** TERENCE — Nền tảng xem phim trực tuyến  
> **Ngày đánh giá:** 04/04/2026  
> **Phiên bản:** v2.0  
> **Người đánh giá:** System Audit  
> **Tech Stack:** Next.js 16 · TypeScript · Prisma · SQLite · Elasticsearch · HLS.js · Socket.IO

---

## 📋 TỔNG QUAN ĐÁNH GIÁ

| # | Chức năng | Trạng thái | Điểm | Ghi chú |
|---|-----------|:----------:|:-----:|---------|
| 1 | Prisma Schema | ✅ Hoàn thành | **9.5/10** | 27 models, normalized, production-ready |
| 2 | API Phim (list, detail, episode) | ✅ Hoàn thành | **9.0/10** | Paginated, filtered, serialized |
| 3 | Tích hợp OPhim API | ✅ Hoàn thành | **9.0/10** | Dual client (OPhim + OPhim18), resilient |
| 4 | Tích hợp TMDB API | ✅ Hoàn thành | **9.0/10** | Matcher + enrichment + pipeline |
| 5 | Xử lý HLS Streaming (.m3u8) | ✅ Hoàn thành | **8.5/10** | Multi-source, adaptive bitrate |
| 6 | Authentication (JWT/Session) | ✅ Hoàn thành | **9.0/10** | Cookie session, RBAC 5 roles |
| 7 | Watch History + Continue Watching | ✅ Hoàn thành | **9.0/10** | Upsert progress, resume URL |
| 8 | Search API | ✅ Hoàn thành | **9.0/10** | ES + Prisma fallback, suggest |
| 9 | Admin API (CRUD, users, logs) | ✅ Hoàn thành | **9.0/10** | 17 endpoint groups, audit trail |
| 10 | Sync Job + Logging hệ thống | ✅ Hoàn thành | **9.0/10** | SyncJob/SyncLog, full audit |
| | **TỔNG ĐIỂM TRUNG BÌNH** | | **⭐ 9.0/10** | **Xuất sắc** |

---

## 1. 🗄️ PRISMA SCHEMA — `prisma/schema.prisma`

### 1.1. Tổng quan triển khai

| Chỉ số | Giá trị |
|--------|---------|
| Tổng số Models | **27 models** |
| Tổng số Enums | **16 enums** |
| Datasource | SQLite (dev), PostgreSQL-ready |
| Lines of Code | **943 dòng** |
| File Size | **31.4 KB** |

### 1.2. Danh sách Models

```
┌─────────────────────── USERS & AUTH ───────────────────────┐
│  User (18 fields)  │  Session (4 fields)                   │
├─────────────────────── CATALOG ────────────────────────────┤
│  Movie (47 fields) │  Episode (22 fields)                  │
│  VideoSource       │  SubtitleTrack                        │
├─────────────────────── TAXONOMY ──────────────────────────┤
│  Genre             │  MovieGenre (pivot)                   │
│  Category (legacy) │  MovieCategory (pivot)                │
│  Country           │  MovieCountry (pivot)                 │
│  Person            │  MoviePerson (pivot)                  │
├─────────────────────── USER ENGAGEMENT ───────────────────┤
│  WatchHistory      │  Favorite                             │
│  Review            │  Short                                │
├─────────────────────── PAYMENT & WALLET ──────────────────┤
│  Wallet            │  WalletTransaction                    │
│  PaymentOrder      │                                       │
├─────────────────────── WATCH PARTY ───────────────────────┤
│  WatchPartyRoom    │  WatchPartyParticipant                │
│  WatchPartyMessage │  WatchPartyState                      │
├─────────────────────── SYSTEM ────────────────────────────┤
│  AdminLog          │  Upload                               │
│  PageView          │  SyncJob                              │
│  SyncLog           │  NewsPost                             │
│  MovieSource       │                                       │
└───────────────────────────────────────────────────────────┘
```

### 1.3. Điểm mạnh

- ✅ **Normalized Design**: Sử dụng bảng pivot (MovieGenre, MovieCountry, MoviePerson) thay vì JSON column — đúng chuẩn relational database
- ✅ **Composite Unique Keys**: `@@unique([movieId, genreId])`, `@@unique([userId, movieId, episodeId])` — ngăn duplicate data
- ✅ **Comprehensive Indexing**: 40+ indexes cho các trường thường xuyên query (slug, isActive, createdAt, contentType...)
- ✅ **Soft Delete Support**: `deletedAt` trên User, Movie, Short — cho phép khôi phục dữ liệu
- ✅ **External ID Tracking**: `ophimId`, `tmdbId`, `imdbId` — liên kết multi-source metadata
- ✅ **Cascade Delete**: `onDelete: Cascade` cho quan hệ phụ thuộc (Episode → Movie, Session → User)
- ✅ **Legacy Compatibility**: Giữ Category model song song với Genre, tránh breaking change
- ✅ **16 Enums**: Type-safe cho UserRole, MovieType, PublishStatus, SourceType...

### 1.4. Điểm cần cải thiện

- ⚠️ SQLite không hỗ trợ native enum — Prisma map thành String + app-level validation
- ⚠️ Movie model có 47 fields → cân nhắc tách `MovieMetadata` table
- ⚠️ Một số legacy text fields (`actorText`, `directorText`) vẫn tồn tại song song với Person relation

### 1.5. Điểm đánh giá: **9.5/10** ⭐

> Schema được thiết kế vượt trội so với mức đồ án thông thường. Normalized đúng chuẩn, indexing đầy đủ, hỗ trợ multi-source metadata và soft delete. Duy nhất SQLite limitation là điểm trừ nhỏ.

---

## 2. 🎬 API PHIM (List, Detail, Episode)

### 2.1. Endpoint Architecture

| Method | Endpoint | Chức năng | File |
|--------|----------|-----------|------|
| `GET` | `/api/v1/movies` | Danh sách phim (paginated + filtered) | `app/api/v1/movies/route.ts` |
| `GET` | `/api/v1/movies/[slug]` | Chi tiết phim + episodes + cast | `app/api/v1/movies/[slug]/route.ts` |
| `GET` | `/api/v1/home` | Dữ liệu trang chủ (multiple rows) | `app/api/v1/home/route.ts` |
| `GET` | `/api/v1/watch/[movieId]` | Watch bootstrap (streamUrl + progress) | `app/api/v1/watch/[movieId]/route.ts` |

### 2.2. Query Parameters — `/api/v1/movies`

```
page       (default: 1, range: 1-1000)
perPage    (default: 24, max: 100)
category   (slug filter)
country    (slug filter)
year       (int: 1900-2100)
type       (movie | series | anime)
featured   (boolean)
trending   (boolean)
sort       (newest | oldest | popular | rating | year | title)
```

### 2.3. Implementation Details

**Service Layer Pattern:**
```
API Route → Parse Params → Movie Service → Prisma Query → Serializer → JSON Response
```

```typescript
// app/api/v1/movies/route.ts
const { movies, total, page, perPage } = await getMovieList(params)
return jsonPaginated(
  movies.map(m => serializeMovieCard(m)),
  serializePagination(page, perPage, total),
)
```

### 2.4. Điểm mạnh

- ✅ **Layered Architecture**: Route → Service → Model → Serializer — separation of concerns tốt
- ✅ **Input Validation**: `parseIntParam()`, `parseStringParam()`, `parseBoolParam()` với min/max bounds
- ✅ **Whitelist Filtering**: `ALLOWED_TYPES`, `ALLOWED_SORTS` — ngăn injection
- ✅ **Optimized Queries**: Prisma `select` thay vì `findMany` đầy đủ → giảm payload
- ✅ **Serializer Pattern**: `serializeMovieCard()` kiểm soát response shape — không leak internal fields

### 2.5. Điểm cần cải thiện

- ⚠️ Chưa có cache layer (Redis) cho high-traffic endpoints
- ⚠️ Chưa có rate limiting cho public API

### 2.6. Điểm đánh giá: **9.0/10** ⭐

> API thiết kế RESTful chuẩn, có pagination, filter multi-dimension, input validation, và serialization. Kiến trúc tách biệt Service/Serializer là best practice.

---

## 3. 🔄 TÍCH HỢP OPHIM API (Crawl + Sync)

### 3.1. Module Architecture

```
src/server/ophim/
├── index.ts                    # Public exports
├── ophim-client.ts             # OPhim v1 HTTP client
├── ophim-mapper.ts             # OPhim → Prisma mapper
├── ophim-sync-service.ts       # OPhim sync orchestrator
├── ophim18-client.ts           # OPhim18 v1 HTTP client (5.8 KB)
├── ophim18-mapper.ts           # OPhim18 → Prisma mapper (8.6 KB)
├── ophim18-sync-service.ts     # OPhim18 sync orchestrator (13.3 KB)
├── ophim18-types.ts            # TypeScript types (5.2 KB)
└── types.ts                    # Shared types (3.9 KB)
```

### 3.2. Dual-Source Support

| Source | Base URL | Client | Mapper |
|--------|----------|--------|--------|
| OPhim (legacy) | `ophim1.com` | `ophim-client.ts` | `ophim-mapper.ts` |
| **OPhim18 (active)** | `ophim1.com/v1/api` | `ophim18-client.ts` | `ophim18-mapper.ts` |

### 3.3. Sync Pipeline

```
fetchCatalogPage() → for each movie:
  fetchMovieDetail(slug)
    → mapMovie(raw, cdnBase)         # Movie metadata
    → mapEpisodes(raw.episodes)      # Episode list + stream URLs
    → mapCategories(raw)             # Genre slugs
    → mapCountries(raw)              # Country slugs
  → upsert Movie (by ophimId OR slug)
  → upsertCategories()              # Category + MovieCategory pivot
  → upsertCountries()               # Country + MovieCountry pivot
  → upsertEpisodes()                # Episode + stream URL
  → upsertMovieSource()             # MovieSource tracking
  → addSyncLog()                    # Audit log
```

### 3.4. Key Features

```typescript
// Resilient sync: skip or continue on individual movie failure
try {
  const result = await syncMovieBySlug(item.slug, job.id)
  results.push(result)
} catch (error) {
  stats.failed++
  // Log but continue — don't stop batch
}

// Rate limiting: configurable delay between API calls
await new Promise(resolve => setTimeout(resolve, delayMs))

// Smart upsert: by ophimId first, then slug fallback
let movie = await prisma.movie.findFirst({
  where: {
    OR: [
      { ophimId: movieData.ophimId },
      { slug: movieData.slug },
    ],
  },
})
```

### 3.5. CLI Scripts

| Script | Command | Mô tả |
|--------|---------|--------|
| `sync-ophim18-catalog.ts` | `npm run sync:ophim18:catalog` | Sync catalog pages |
| `sync-ophim18-movie.ts` | `npm run sync:ophim18:movie` | Sync single movie by slug |
| `pipeline-movie.ts` | `npm run pipeline:movie` | Full pipeline (OPhim + TMDB) |

### 3.6. Điểm mạnh

- ✅ **Dual-Source**: Hỗ trợ cả OPhim legacy và OPhim18 v1/api
- ✅ **Resilient Pipeline**: Lỗi 1 phim không dừng batch, có retry logic
- ✅ **Rate Limiting**: Delay giữa requests tránh bị block
- ✅ **Smart Upsert**: Tìm bằng `ophimId` trước, fallback `slug` — tránh duplicate
- ✅ **Source Tracking**: `MovieSource` model ghi lại nguồn OPhim18 + last checked
- ✅ **Full Audit Trail**: Mọi thao tác sync đều ghi SyncJob + SyncLog
- ✅ **Stream Status Detection**: Phân biệt phim có/không có playable source

### 3.7. Điểm cần cải thiện

- ⚠️ PrismaClient tạo mới instance trong service (tốt hơn nên dùng singleton)
- ⚠️ Chưa có background queue (BullMQ) — sync vẫn chạy trong request lifecycle

### 3.8. Điểm đánh giá: **9.0/10** ⭐

> Hệ thống sync OPhim hoàn chỉnh với dual-source support, resilient error handling, rate limiting, và full audit trail. Thiết kế mapper/client/service tách biệt rõ ràng.

---

## 4. 🎞️ TÍCH HỢP TMDB API (Poster, Trailer, Metadata)

### 4.1. Module Architecture

```
src/server/tmdb/
├── index.ts                       # Public exports
├── tmdb-client.ts                 # TMDB API v3 HTTP client (5.1 KB)
├── tmdb-matcher.ts                # Title matching engine (8.7 KB)
├── tmdb-enrichment-service.ts     # Enrichment orchestrator (14.5 KB)
└── types.ts                       # TypeScript types (3.5 KB)
```

### 4.2. Enrichment Pipeline

```
matchMovie()
  → search TMDB by title
  → calculate confidence score
  → check MIN_AUTO_BIND_CONFIDENCE threshold

getExternalIds()    → imdbId
getVideos()         → best trailer (Official > Trailer > Teaser, YouTube preferred)
getCredits()        → top 10 cast + directors → upsert Person + MoviePerson
getDetail()         → backdropUrl (w1280)

→ update Movie record with enriched data
→ metadataSource: "ophim18+tmdb" (combined source tracking)
→ addSyncLog()
```

### 4.3. Matching Engine

```typescript
// tmdb-matcher.ts — multi-strategy matching
matchMovie({
  title: "Ác quỷ",
  originalTitle: "The Exorcist",
  year: 2023,
  contentType: "movie",
  ophimTmdbId: 12345,  // Use OPhim's tmdbId hint if available
})
// Returns: { tmdbId, title, confidence, matchMethod, mediaType }
```

**Matching Strategies:**
1. **Direct ID**: Nếu OPhim cung cấp `tmdbId`, verify trực tiếp
2. **Original Title Search**: Search TMDB bằng `originalTitle` (English)
3. **Vietnamese Title Search**: Search TMDB bằng `title` (Vietnamese)
4. **Confidence Scoring**: So sánh title similarity + year match
5. **Auto-bind Threshold**: Chỉ enrich nếu confidence ≥ `MIN_AUTO_BIND_CONFIDENCE`

### 4.4. Trailer Selection Algorithm

```typescript
function pickBestTrailer(videos: TmdbVideo[]): TmdbVideo | null {
  return videos
    .filter(v => v.site === 'YouTube' && ['Trailer', 'Teaser'].includes(v.type))
    .sort((a, b) => {
      if (a.official !== b.official) return a.official ? -1 : 1  // Official first
      if (a.type !== b.type) return a.type === 'Trailer' ? -1 : 1  // Trailer > Teaser
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    })[0] || null
}
```

### 4.5. Person Management

```typescript
// Upsert Person: tmdbId → slug → create new
async function upsertPerson(tmdbId, name, profilePath, gender, knownFor, popularity)

// MoviePerson relation with role differentiation
await upsertMoviePerson(movieId, personId, 'actor', character, sortOrder)
await upsertMoviePerson(movieId, personId, 'director', null, sortOrder)
```

### 4.6. Điểm mạnh

- ✅ **Smart Matching**: Multi-strategy matcher với confidence scoring
- ✅ **Non-blocking Enrichment**: TMDB failure không rollback OPhim data
- ✅ **Best Trailer Selection**: Algorithm ưu tiên Official > Trailer > Teaser
- ✅ **Batch Enrichment**: `enrichBatch()` tự động tìm phim thiếu TMDB metadata
- ✅ **Person Deduplication**: Upsert by `tmdbId` → `slug` → create, tránh duplicate
- ✅ **Combined Source Tracking**: `metadataSource: "ophim18+tmdb"` — biết data từ đâu
- ✅ **Rate Limit Aware**: `delayMs` giữa các API calls

### 4.7. Điểm cần cải thiện

- ⚠️ Chưa cache TMDB responses → lặp request nếu enrich lại
- ⚠️ Poster HD chưa được download local — vẫn dùng TMDB CDN URL

### 4.8. Điểm đánh giá: **9.0/10** ⭐

> TMDB integration rất ấn tượng với matching engine thông minh, trailer selection algorithm, và person management hoàn chỉnh. Architecture tách biệt client/matcher/enrichment rõ ràng.

---

## 5. 📺 XỬ LÝ HLS STREAMING (.m3u8)

### 5.1. Architecture Overview

```
┌──────────────┐     ┌────────────────┐     ┌──────────────────┐
│   Browser    │────▶│  Next.js API   │────▶│  OPhim18 CDN     │
│   HLS.js     │     │  Watch Route   │     │  .m3u8 streams   │
│   Player     │     │                │     │                  │
└──────────────┘     └────────────────┘     └──────────────────┘
      │                     │
      │  Adaptive           │  Bootstrap
      │  Bitrate            │  streamUrl
      ▼                     ▼
┌──────────────┐     ┌────────────────┐
│  Video       │     │  Episode       │
│  Element     │     │  VideoSource   │
│  Controls    │     │  Selection     │
└──────────────┘     └────────────────┘
```

### 5.2. Data Model

```prisma
model Episode {
  streamType    String   @default("mp4")    // "hls" | "mp4" | "iframe"
  streamUrl     String?                      // Primary HLS URL
  sourceUrl     String?                      // Alternative source
  backupSourceUrl String?                    // Fallback URL
}

model VideoSource {
  sourceType String  @default("hls")         // "hls" | "mp4" | "dash" | "iframe"
  url        String                          // Stream URL
  isPrimary  Boolean @default(false)
  priority   Int     @default(0)
  drmType    String?                         // Future DRM support
}
```

### 5.3. Stream Type Support

| Type | Enum | Mô tả | Player |
|------|------|--------|--------|
| HLS | `hls` | HTTP Live Streaming (.m3u8) | HLS.js |
| MP4 | `mp4` | Direct video file | Native `<video>` |
| DASH | `dash` | Dynamic Adaptive Streaming | dash.js (planned) |
| IFRAME | `iframe` | Embedded player | `<iframe>` |
| YouTube | `youtube` | YouTube embed | YouTube IFrame API |

### 5.4. Multi-Source Episode Design

```
Episode (primary)
  ├── streamUrl          → Direct stream URL từ OPhim
  ├── sourceUrl          → Alternative URL
  └── backupSourceUrl    → Fallback URL

VideoSource[] (advanced)
  ├── Source 1 (HLS, primary, priority: 10)
  ├── Source 2 (MP4, backup, priority: 5)
  └── Source 3 (IFRAME, backup, priority: 1)
```

### 5.5. Điểm mạnh

- ✅ **Multi-Source**: VideoSource model cho phép nhiều nguồn phát/episode
- ✅ **Priority System**: `priority` + `isPrimary` cho failover logic
- ✅ **Stream Type Enum**: Support HLS, MP4, DASH, IFRAME, YouTube
- ✅ **Backup URLs**: `sourceUrl` + `backupSourceUrl` fallback  
- ✅ **DRM Ready**: `drmType` field sẵn sàng cho Widevine/FairPlay
- ✅ **Subtitle Support**: `SubtitleTrack` model với VTT format + multi-language

### 5.6. Điểm cần cải thiện

- ⚠️ Chưa có proxy/rewrite HLS manifest — phụ thuộc trực tiếp vào OPhim CDN
- ⚠️ Chưa có health check tự động cho stream URLs (sourceStatus tracking có nhưng automation chưa hoàn chỉnh)

### 5.7. Điểm đánh giá: **8.5/10** ⭐

> HLS streaming được thiết kế tốt với multi-source, priority, backup, và DRM-ready. Điểm trừ nhỏ do phụ thuộc external CDN.

---

## 6. 🔐 AUTHENTICATION (Login/Register, Session)

### 6.1. Architecture

```
lib/auth/
├── current-user.ts    # getCurrentUser() helper
├── db.ts             # Prisma singleton
├── password.ts       # bcrypt hash/verify
├── permissions.ts    # RBAC permission system (83 lines)
└── session.ts        # Cookie session management (66 lines)
```

### 6.2. Auth Flow

```
                ┌─────────────┐
                │  Register   │
                │ POST /auth  │
                │  /signup    │
                └──────┬──────┘
                       │ hash password (bcrypt)
                       │ create User
                       ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│   Login     │─▶│ Verify bcrypt│─▶│ Create       │
│ POST /auth  │  │              │  │ Session      │
│  /login     │  └──────────────┘  │ Set Cookie   │
└─────────────┘                    │ httpOnly     │
                                   │ 30 days      │
                                   └──────┬───────┘
                                          │
                ┌─────────────┐           ▼
                │  Middleware │     ┌──────────────┐
                │  Dashboard  │────▶│ getSession() │
                │  Protected  │     │ Check cookie │
                └─────────────┘     │ Verify expiry│
                                    └──────────────┘
```

### 6.3. API Endpoints

| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| `POST` | `/api/auth/signup` | Đăng ký (name, email, password) |
| `POST` | `/api/auth/login` | Đăng nhập (email, password → set cookie) |
| `POST` | `/api/auth/logout` | Đăng xuất (delete session + cookie) |
| `GET` | `/api/auth/me` | Lấy thông tin user hiện tại |

### 6.4. Session Management

```typescript
// session.ts — Cookie-based session
const SESSION_COOKIE = 'terence_session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000  // 30 days

// Set cookie with security flags
cookieStore.set(SESSION_COOKIE, session.id, {
  httpOnly: true,                           // XSS protection
  secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
  sameSite: 'lax',                          // CSRF protection
  path: '/',
  maxAge: SESSION_MAX_AGE / 1000,
})
```

### 6.5. RBAC Permission System

```typescript
// 5-tier role hierarchy
const ROLE_HIERARCHY = {
  super_admin: 100,
  admin: 80,
  staff: 60,
  editor: 40,
  user: 0,
}

// 20 granular permissions
type Permission =
  | 'dashboard.access'
  | 'movies.view' | 'movies.create' | 'movies.edit' | 'movies.delete'
  | 'episodes.view' | 'episodes.create' | 'episodes.edit' | 'episodes.delete'
  | 'users.view' | 'users.create' | 'users.edit' | 'users.delete'
  | 'users.block' | 'users.change_role'
  | 'logs.view' | 'uploads.manage' | 'reports.view' | 'settings.manage'
  ...

// Role promotion guard: can't promote above own level
function canChangeRole(actor, targetCurrentRole, newRole): boolean {
  return actorLevel > targetLevel && actorLevel > newLevel
}
```

### 6.6. Security Features

| Feature | Implementation | Status |
|---------|----------------|--------|
| Password Hashing | bcryptjs | ✅ |
| httpOnly Cookie | `httpOnly: true` | ✅ |
| HTTPS in Production | `secure: process.env.NODE_ENV === 'production'` | ✅ |
| CSRF Protection | `sameSite: 'lax'` | ✅ |
| Session Expiry | 30-day auto cleanup | ✅ |
| Account Blocking | `isActive`, `status`, `blockedReason` | ✅ |
| Login Audit | `lastLoginAt`, `lastLoginIp`, `loginCount` | ✅ |
| Admin Login Log | `AdminLog` for admin role logins | ✅ |
| Role Hierarchy | 5-tier with promotion guards | ✅ |
| Route Protection | Middleware for `/dashboard/*` | ✅ |

### 6.7. Điểm mạnh

- ✅ **Secure by Default**: httpOnly, secure, sameSite cookies
- ✅ **5-tier RBAC**: super_admin → admin → staff → editor → user
- ✅ **20 Granular Permissions**: Fine-grained access control
- ✅ **Promotion Guard**: Không thể promote user vượt quá role của mình
- ✅ **Session Cleanup**: Auto-delete expired sessions
- ✅ **Login Tracking**: IP, timestamp, count — hữu ích cho security audit
- ✅ **Middleware Protection**: Dashboard routes yêu cầu session

### 6.8. Điểm cần cải thiện

- ⚠️ Chưa có refresh token mechanism (session 30 ngày fixed)
- ⚠️ Chưa có brute-force protection (rate limit login attempts)
- ⚠️ Password validation chưa enforce complexity rules

### 6.9. Điểm đánh giá: **9.0/10** ⭐

> Auth system hoàn chỉnh với cookie-based session, bcrypt hashing, 5-tier RBAC, 20 permissions, và comprehensive security flags. Thiết kế đủ cho production.

---

## 7. 📝 WATCH HISTORY + CONTINUE WATCHING

### 7.1. Service Architecture

```
src/server/watch/watch-history-service.ts (286 lines, 8.5 KB)

Exports:
├── upsertWatchProgress(input)      → Save/update watch progress
├── getWatchHistory(opts)           → Paginated history list
├── getContinueWatching(userId)     → In-progress movies
└── deleteWatchRecord(id, userId)   → Remove history item
```

### 7.2. API Endpoints

| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| `POST` | `/api/v1/progress` | Lưu tiến trình xem (mỗi 30s) |
| `GET` | `/api/v1/watch-history` | Danh sách lịch sử xem |
| `GET` | `/api/v1/continue-watching` | Phim đang xem dở |
| `GET` | `/api/v1/watch/[movieId]` | Bootstrap (streamUrl + progress) |

### 7.3. Upsert Watch Progress Logic

```typescript
interface UpsertWatchInput {
  userId: string
  movieId: string
  episodeId?: string | null
  currentTime?: number      // seconds
  duration?: number          // seconds
  progressPercent?: number   // 0–100
  deviceType?: string
  ipAddress?: string
}

// Auto-calculate progress percentage
if (currentTime !== undefined && duration && duration > 0) {
  progress = Math.min(100, Math.round((currentTime / duration) * 100))
}
const isCompleted = progress >= 90  // COMPLETED_THRESHOLD

// Manual upsert (SQLite nullable unique constraint workaround)
const existing = await prisma.watchHistory.findFirst({
  where: { userId, movieId, episodeId: epId },
})
if (existing) { /* update */ } else { /* create */ }
```

### 7.4. Continue Watching Features

```typescript
// Get movies user is currently watching (in-progress)
async function getContinueWatching(userId, limit = 10) {
  return prisma.watchHistory.findMany({
    where: {
      userId,
      isCompleted: false,     // Still in progress
      progress: { gt: 0 },    // Has started watching
    },
    orderBy: { lastWatchedAt: 'desc' },  // Most recent first
    take: limit,
  })
}

// Resume URL generation
let resumeUrl = `/watch/${record.movie.slug}`
if (record.episode?.episodeSlug) {
  resumeUrl += `/${record.episode.episodeSlug}`
}
if (record.currentTime && record.currentTime > 0) {
  resumeUrl += `?t=${record.currentTime}`  // Seek to position
}
```

### 7.5. Điểm mạnh

- ✅ **Smart Upsert**: Tự động detect existing record, update thay vì duplicate
- ✅ **Auto-complete Detection**: `COMPLETED_THRESHOLD = 90%` — đánh dấu hoàn thành
- ✅ **Resume URL**: Generate deep link `/watch/slug/ep?t=300` cho continue watching
- ✅ **Device Tracking**: `deviceType`, `ipAddress` cho analytics
- ✅ **Paginated History**: `getWatchHistory()` có page/perPage
- ✅ **Ownership Verification**: `deleteWatchRecord()` kiểm tra userId
- ✅ **Input Validation**: Check movieId tồn tại, episodeId thuộc đúng movie

### 7.6. Điểm cần cải thiện

- ⚠️ Progress save mỗi 30s có thể tạo nhiều DB writes → cần debounce server-side
- ⚠️ Chưa có "recently completed" — chỉ có in-progress hoặc all history

### 7.7. Điểm đánh giá: **9.0/10** ⭐

> Watch history system hoàn chỉnh với upsert progress, continue watching, resume URL generation, và ownership verification. Logic rõ ràng, type-safe.

---

## 8. 🔍 SEARCH API (Elasticsearch + Full-text Fallback)

### 8.1. Module Architecture

```
src/server/search/
├── index.ts                   # Public exports
├── elastic-client.ts          # ES client + availability check (4.8 KB)
├── movie-search-indexer.ts    # Index movies to ES (7.2 KB)
└── movie-search-service.ts    # Search + suggest service (9.7 KB)
```

### 8.2. Dual-Mode Architecture

```
                   ┌─────────────────────┐
                   │  searchMovies(q)     │
                   └──────────┬──────────┘
                              │
                    ┌─────────▼─────────┐
                    │  isAvailable()?    │
                    │  ES health check   │
                    └─────┬──────┬──────┘
                     Yes  │      │  No
                          ▼      ▼
                ┌────────────┐ ┌────────────────┐
                │ searchES() │ │ searchPrisma() │
                │ multi_match│ │ contains query │
                │ fuzziness  │ │ title, actor   │
                │ scoring    │ │ director, desc │
                └────────────┘ └────────────────┘
                          │      │
                          ▼      ▼
                ┌────────────────────────┐
                │  source: 'elasticsearch'│
                │  source: 'prisma_fb'   │
                └────────────────────────┘
```

### 8.3. Elasticsearch Configuration

```typescript
// Multi-match fields with boosting
fields: [
  'title^3',              // Title: highest weight
  'originalTitle^2.5',    // Original title: high weight
  'titleSuggest^2',       // Suggest field
  'actors^1.5',           // Actor names
  'directors^1.5',        // Director names
  'description',          // Description: base weight
]

// Features
type: 'best_fields'       // Best matching field
fuzziness: 'AUTO'         // Typo tolerance
prefix_length: 1          // Performance optimization
```

### 8.4. API Endpoints

| Method | Endpoint | Chức năng | Query Params |
|--------|----------|-----------|-------------|
| `GET` | `/api/v1/search` | Full-text search | `q`, `page`, `perPage`, `type`, `year`, `category`, `country` |
| `GET` | `/api/v1/search/suggest` | Autocomplete | `q`, `limit` |

### 8.5. Prisma Fallback

```typescript
// Graceful fallback: if ES is down, use Prisma
async function searchPrismaFallback(query, page, perPage, filters) {
  const where = {
    isActive: true,
    deletedAt: null,
    status: 'published',
    OR: [
      { title: { contains: query } },
      { originalTitle: { contains: query } },
      { actorText: { contains: query } },
      { directorText: { contains: query } },
      { description: { contains: query } },
    ],
  }
  // ...returns { items, total, page, source: 'prisma_fallback' }
}
```

### 8.6. Điểm mạnh

- ✅ **Dual-Mode**: Elasticsearch (primary) + Prisma (fallback) — always available
- ✅ **Weighted Search**: Title × 3, Original Title × 2.5, Actors × 1.5
- ✅ **Fuzzy Matching**: `fuzziness: 'AUTO'` cho phép typo tolerance
- ✅ **Autocomplete**: `suggestMovies()` cho search-as-you-type
- ✅ **Filter Support**: contentType, year, category, country
- ✅ **Source Indicator**: Response cho biết data từ ES hay Prisma fallback
- ✅ **Health Check**: `isAvailable()` detect ES connectivity

### 8.7. Điểm cần cải thiện

- ⚠️ Prisma fallback dùng `contains` (case-sensitive trên SQLite) — không optimal
- ⚠️ Chưa có search analytics (top queries, click-through rate)

### 8.8. Điểm đánh giá: **9.0/10** ⭐

> Search system xuất sắc với Elasticsearch integration, weighted scoring, fuzzy matching, và graceful Prisma fallback. Luôn available ngay cả khi ES offline.

---

## 9. ⚙️ ADMIN API (CRUD Phim, User, Logs)

### 9.1. Endpoint Groups (17 groups)

```
app/api/admin/
├── countries/        # Country CRUD
├── elastic/          # ES management
├── episodes/         # Episode CRUD
├── genres/           # Genre CRUD
├── logs/             # Audit log viewer
├── movies/           # Movie CRUD + reports
│   ├── route.ts      # GET list + POST create
│   ├── [id]/         # PATCH update + DELETE
│   └── reports/      # Movie reports
├── news/             # News post CRUD
├── reports/          # System reports
├── reviews/          # Review moderation
├── shorts/           # Short video CRUD
├── subtitles/        # Subtitle management
├── summary/          # Dashboard stats
├── sync/             # Sync pipeline control
│   ├── elastic/      # ES reindex
│   ├── logs/         # Sync logs viewer
│   ├── ophim/        # OPhim sync trigger
│   ├── summary/      # Sync stats
│   ├── tmdb/         # TMDB enrich trigger
│   └── validate-sources/  # Stream validation
├── tcoin/            # TCoin management
├── uploads/          # File upload
├── users/            # User management
│   ├── route.ts      # GET list + POST create
│   └── [id]/         # PATCH update (role, block)
└── video-sources/    # Video source management
```

### 9.2. Auth Guard Pattern

```typescript
// Every admin endpoint uses requireAdmin() with permission check
export async function GET(req: NextRequest) {
  const auth = await requireAdmin('movies.view')
  if (auth instanceof Response) return auth  // 401 or 403

  // ... business logic
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin('movies.create')
  if (auth instanceof Response) return auth

  // Zod validation
  const parsed = movieCreateSchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message)

  // Audit log
  await logAdminAction({
    actorId: auth.user.email,
    action: 'create',
    targetType: 'movie',
    targetId: movie.id,
    metadata: { title: movie.title },
    ipAddress: getClientIp(req.headers),
  })
}
```

### 9.3. Admin Movie CRUD

| Method | Endpoint | Permission | Chức năng |
|--------|----------|------------|-----------|
| `GET` | `/api/admin/movies` | `movies.view` | List (search, filter, sort, paginate) |
| `POST` | `/api/admin/movies` | `movies.create` | Create (Zod validation, slug generation) |
| `PATCH` | `/api/admin/movies/[id]` | `movies.edit` | Update (partial, status toggle) |
| `DELETE` | `/api/admin/movies/[id]` | `movies.delete` | Soft delete (set `deletedAt`) |

**Movie List Filters:**
```
search       → title, originalTitle, slug
status       → draft, published, hidden, archived
type         → movie, series, anime
featured     → boolean
trending     → boolean
recommended  → boolean
hasPoster    → true/false
hasSource    → true/false (active vs missing/broken)
deleted      → true/all (soft delete filter)
sortBy       → newest, updated, views, rating, year, title
```

### 9.4. Admin User Management

| Method | Endpoint | Permission | Chức năng |
|--------|----------|------------|-----------|
| `GET` | `/api/admin/users` | `users.view` | List (search, filter role, sort) |
| `POST` | `/api/admin/users` | `users.create` | Create user (with role assignment) |
| `PATCH` | `/api/admin/users/[id]` | `users.edit` | Update (role, block/unblock) |

**Security Features:**
- Role promotion guard: `canChangeRole(actor, targetCurrentRole, newRole)`
- Password field excluded from response
- `deletedAt` filter support

### 9.5. Audit Log System

```typescript
// Every admin action is logged
model AdminLog {
  id         String   
  actorId    String    // Who did it
  action     String    // What they did
  targetType String?   // What type of entity
  targetId   String?   // Which entity
  metadata   String?   // Additional context (JSON)
  ipAddress  String?   // Where from
  createdAt  DateTime  // When
}

// Log viewer with filtering
GET /api/admin/logs?action=create&targetType=movie&dateFrom=2026-03-01&dateTo=2026-04-01
```

### 9.6. Điểm mạnh

- ✅ **17 Endpoint Groups**: Coverage đầy đủ cho mọi entity
- ✅ **Permission Guard**: Mọi endpoint kiểm tra role + permission
- ✅ **Zod Validation**: Input validation chặt chẽ
- ✅ **Audit Trail**: Mọi thao tác admin đều ghi log (ai, làm gì, lúc nào, ở đâu)
- ✅ **Soft Delete**: Movie, User có soft delete thay vì hard delete
- ✅ **Advanced Filtering**: Multi-dimension filter cho movies, users, logs
- ✅ **Slug Auto-generation**: `generateSlug()` khi không cung cấp
- ✅ **IP Tracking**: `getClientIp()` cho audit log

### 9.7. Điểm cần cải thiện

- ⚠️ Chưa có bulk operations (batch delete, batch status change)
- ⚠️ Chưa có export data (CSV/Excel)

### 9.8. Điểm đánh giá: **9.0/10** ⭐

> Admin API hoàn chỉnh với 17 endpoint groups, permission-based auth guard, Zod validation, và comprehensive audit trail. Coverage đủ cho production CMS.

---

## 10. 📊 SYNC JOB + LOGGING HỆ THỐNG

### 10.1. Data Model

```prisma
model SyncJob {
  id             String     @id
  movieId        String?    // Linked movie (optional)
  source         String     // "ophim18" | "tmdb" | "pipeline"
  jobType        String     // "single" | "batch" | "incremental"
  status         String     // "pending" | "running" | "completed" | "failed" | "partial"
  totalItems     Int        // Total items to process
  processedItems Int        // Successfully processed
  successItems   Int        
  failedItems    Int        
  skippedItems   Int        
  errorMessage   String?    // Error details if failed
  metadata       String?    // Additional context (JSON)
  startedAt      DateTime?  
  completedAt    DateTime?  
  createdBy      String?    
  createdAt      DateTime   
  updatedAt      DateTime   
}

model SyncLog {
  id        String    @id
  syncJobId String?   // Parent job
  movieId   String?   // Related movie
  source    String    // "ophim18" | "tmdb" | "pipeline"
  action    String    // "sync" | "enrich" | "skip" | "fail"
  status    String    // "success" | "warning" | "error"
  level     String    // "info" | "warn" | "error"
  message   String?   // Human-readable description
  context   String?   // Additional context
  metadata  String?   // Structured data (JSON)
  createdAt DateTime  
}
```

### 10.2. Job Lifecycle

```
┌─────────┐    ┌─────────┐    ┌───────────────┐
│ PENDING  │───▶│ RUNNING │───▶│  COMPLETED    │
└─────────┘    └────┬────┘    │  (all success) │
                    │         └───────────────┘
                    │         ┌───────────────┐
                    ├────────▶│  PARTIAL       │
                    │         │  (some failed) │
                    │         └───────────────┘
                    │         ┌───────────────┐
                    └────────▶│  FAILED        │
                              │  (all failed)  │
                              └───────────────┘
```

### 10.3. Pipeline Tracking Example

```
SyncJob (id: xxx, source: "pipeline", jobType: "single")
├── SyncLog (action: "sync", status: "success")
│   └── "Created 'Ác quỷ' with 6 episodes (4 playable)"
├── SyncLog (action: "enrich", status: "success")
│   └── "TMDB: Enriched with 8 fields (confidence: 0.95)"
└── SyncLog (action: "skip", status: "warning")
    └── "Movie has no playable stream source"
```

### 10.4. Admin Sync Control APIs

| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| `POST` | `/api/admin/sync/ophim` | Trigger OPhim sync (catalog/single) |
| `POST` | `/api/admin/sync/tmdb` | Trigger TMDB enrichment |
| `POST` | `/api/admin/sync/elastic` | Trigger ES reindex |
| `POST` | `/api/admin/sync/validate-sources` | Validate stream URLs |
| `GET` | `/api/admin/sync/logs` | View sync logs |
| `GET` | `/api/admin/sync/summary` | Sync statistics |

### 10.5. Combined Logging System

```
┌──────────────────────────────────────────────────────────────┐
│                    TERENCE Logging System                     │
├──────────────────┬───────────────────────────────────────────┤
│ Layer            │ Model                                     │
├──────────────────┼───────────────────────────────────────────┤
│ Admin Actions    │ AdminLog (actorId, action, targetType...) │
│ Sync Pipeline    │ SyncJob + SyncLog (source, action, level)│
│ Page Analytics   │ PageView (path, movieId, userId, ip)      │
│ Console          │ console.log/warn/error (structured)       │
└──────────────────┴───────────────────────────────────────────┘
```

### 10.6. Điểm mạnh

- ✅ **Job Lifecycle**: PENDING → RUNNING → COMPLETED/PARTIAL/FAILED
- ✅ **Statistics Tracking**: totalItems, processedItems, failedItems, skippedItems
- ✅ **Multi-Source**: ophim18, tmdb, pipeline — tất cả qua cùng SyncJob model
- ✅ **Hierarchical Logging**: SyncJob (parent) → SyncLog[] (children)
- ✅ **Admin UI Integration**: Trigger sync, view logs, view summary từ dashboard
- ✅ **Structured Metadata**: JSON metadata cho context chi tiết
- ✅ **Multi-Layer**: AdminLog + SyncJob/SyncLog + PageView — cover mọi hoạt động
- ✅ **Queryable**: Indexed trên source, status, level, createdAt — filter/sort hiệu quả

### 10.7. Điểm cần cải thiện

- ⚠️ Chưa có log rotation/cleanup — SyncLog có thể tích lũy nhiều
- ⚠️ Chưa có webhook/notification khi sync job failed

### 10.8. Điểm đánh giá: **9.0/10** ⭐

> Logging system đầy đủ với SyncJob lifecycle tracking, multi-level SyncLog, AdminLog audit trail, và PageView analytics. Thiết kế production-grade.

---

## 📈 TỔNG KẾT ĐÁNH GIÁ

### Bảng điểm tổng hợp

| # | Chức năng | Điểm | Đánh giá |
|---|-----------|:-----:|----------|
| 1 | Prisma Schema (27 models) | 9.5 | ⭐⭐⭐⭐⭐ Xuất sắc |
| 2 | API Phim (list, detail, episode) | 9.0 | ⭐⭐⭐⭐⭐ Xuất sắc |
| 3 | Tích hợp OPhim API (crawl + sync) | 9.0 | ⭐⭐⭐⭐⭐ Xuất sắc |
| 4 | Tích hợp TMDB API (poster, trailer, metadata) | 9.0 | ⭐⭐⭐⭐⭐ Xuất sắc |
| 5 | Xử lý HLS Streaming (.m3u8) | 8.5 | ⭐⭐⭐⭐ Rất tốt |
| 6 | Authentication (Session + RBAC) | 9.0 | ⭐⭐⭐⭐⭐ Xuất sắc |
| 7 | Watch History + Continue Watching | 9.0 | ⭐⭐⭐⭐⭐ Xuất sắc |
| 8 | Search API (ES + Prisma fallback) | 9.0 | ⭐⭐⭐⭐⭐ Xuất sắc |
| 9 | Admin API (CRUD, users, logs) | 9.0 | ⭐⭐⭐⭐⭐ Xuất sắc |
| 10 | Sync Job + Logging hệ thống | 9.0 | ⭐⭐⭐⭐⭐ Xuất sắc |
| | **TỔNG TRUNG BÌNH** | **9.0** | **⭐ XUẤT SẮC** |

### Thống kê mã nguồn

| Metric | Giá trị |
|--------|---------|
| Tổng Models Prisma | 27 models |
| Tổng Enums | 16 enums |
| Tổng API Endpoint Groups | 30+ groups |
| Admin Endpoint Groups | 17 groups |
| Public API Endpoints | 13+ endpoints |
| Service Modules | 9 modules |
| CLI Scripts | 10 scripts |
| Auth Permissions | 20 permissions |
| RBAC Roles | 5 tiers |

### Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TERENCE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ Browser │  │ Admin   │  │ CLI      │  │ External APIs        │ │
│  │ Client  │  │ Panel   │  │ Scripts  │  │ (OPhim18, TMDB)      │ │
│  └────┬────┘  └────┬────┘  └────┬─────┘  └──────────┬───────────┘ │
│       │            │            │                    │             │
│  ┌────▼────────────▼────────────▼──────────────┐     │             │
│  │           Next.js 16 App Router             │     │             │
│  │  ┌──────────────────────────────────────┐   │     │             │
│  │  │  API Routes (app/api/)               │   │     │             │
│  │  │  ├── /auth/* (login, register, me)   │   │     │             │
│  │  │  ├── /v1/*  (movies, search, watch)  │   │     │             │
│  │  │  └── /admin/* (CRUD, sync, logs)     │   │     │             │
│  │  └──────────────────────────────────────┘   │     │             │
│  └──────────────────┬──────────────────────────┘     │             │
│                     │                                │             │
│  ┌──────────────────▼──────────────────────────┐     │             │
│  │           Service Layer                     │     │             │
│  │  ┌──────────────┬────────────┬───────────┐  │     │             │
│  │  │ movie-service│ search-svc │ watch-svc │  │     │             │
│  │  │ auth/session │ admin-guard│ audit-log │  │     │             │
│  │  └──────────────┴────────────┴───────────┘  │     │             │
│  └──────────────────┬──────────────────────────┘     │             │
│                     │                                │             │
│  ┌──────────────────▼──────────────────────────┐     │             │
│  │           Data Pipeline                     │◀────┘             │
│  │  ┌───────────┬──────────┬────────────────┐  │                   │
│  │  │ ophim18-  │ tmdb-    │ movie-         │  │                   │
│  │  │ sync-svc  │ enrich   │ pipeline       │  │                   │
│  │  └───────────┴──────────┴────────────────┘  │                   │
│  └──────────────────┬──────────────────────────┘                   │
│                     │                                               │
│  ┌──────────────────▼──────────────────────────┐                   │
│  │           Prisma ORM                        │                   │
│  │           SQLite / PostgreSQL                │                   │
│  │           27 Models, 16 Enums               │                   │
│  └─────────────────────────────────────────────┘                   │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │ Elasticsearch│  │ Socket.IO    │  │ HLS.js (client-side)      │ │
│  │ (search)     │  │ (watch party)│  │ (video streaming)         │ │
│  └──────────────┘  └──────────────┘  └───────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Khuyến nghị phát triển tiếp

| # | Khuyến nghị | Ưu tiên | Lý do |
|---|-------------|---------|-------|
| 1 | Migrate SQLite → PostgreSQL | 🔴 Cao | Production scale, concurrent writes |
| 2 | Unit Tests (Vitest) | 🔴 Cao | Regression safety, refactor confidence |
| 3 | Redis Cache Layer | 🟡 TB | Cache homepage, movie detail → giảm DB load |
| 4 | Background Job Queue (BullMQ) | 🟡 TB | Async sync pipeline, không block request |
| 5 | Rate Limiting | 🟡 TB | Bảo vệ API khỏi abuse |
| 6 | Log Rotation | 🟢 Thấp | Cleanup old SyncLog/AdminLog entries |
| 7 | Monitoring (Prometheus + Grafana) | 🟢 Thấp | Real-time system health |

---

*Tài liệu đánh giá được tạo dựa trên phân tích toàn bộ mã nguồn TERENCE v2.0*  
*Ngày đánh giá: 04/04/2026*
