
# TERENCE — Architecture Document

## Overview

TERENCE follows a **Layered Modular Monolith** architecture within the Next.js App Router framework.

---

## Backend Architecture

```
┌──────────────────────────────────────────────┐
│  API Routes (app/api/*)                      │
│  └─ Request parsing, auth check, response    │
├──────────────────────────────────────────────┤
│  Services (lib/services/*)                   │
│  └─ Business logic, caching, orchestration   │
├──────────────────────────────────────────────┤
│  Repositories (lib/repositories/*)           │
│  └─ Database access, Prisma queries          │
├──────────────────────────────────────────────┤
│  Database (Prisma + SQLite)                  │
│  └─ Schema, migrations, seed                 │
└──────────────────────────────────────────────┘
```

### Layer Rules

| Layer | May Call | Must NOT Call |
|-------|---------|---------------|
| **API Route** | Services, Validators, Auth | Repositories, Prisma directly |
| **Service** | Repositories, Cache, External APIs | Prisma directly |
| **Repository** | Prisma only | Services, External APIs |
| **Cache** | Nothing (pure storage) | — |

### Key Modules

| Module | Location | Purpose |
|--------|----------|---------|
| `lib/api/handler.ts` | API layer | Unified response shapes, body parsing, error handling |
| `lib/api/rate-limit.ts` | API layer | In-memory rate limiting |
| `lib/validators/` | Validation | All Zod schemas |
| `lib/services/` | Service layer | Business logic + cache |
| `lib/repositories/` | Data access | All Prisma queries |
| `lib/cache/` | Infra | TTL cache with tag invalidation |
| `lib/auth/` | Auth | Session, permissions, current user |
| `lib/admin/` | Admin | Audit log, admin helpers |
| `lib/tmdb/` | External | TMDB API client + mapper |
| `services/tmdb/` | External | TMDB movie/tv/search services |
| `services/video-source/` | External | Multi-provider video resolver |
| `server/socket/` | Realtime | Socket.IO handlers |
| `src/server/` | Server modules | Modular server-side business logic |

---

## Frontend Architecture

```
┌──────────────────────────────────────────────┐
│  Pages (app/*)                               │
│  └─ Server Components (data fetching)        │
│  └─ Client Components (interactivity)        │
├──────────────────────────────────────────────┤
│  Components                                  │
│  ├─ layout/    (Header, Footer, AppLayout)   │
│  ├─ movie/     (MovieCard, MovieGrid, etc.)  │
│  ├─ review/    (ReviewCard, ReviewReel)       │
│  ├─ common/    (Skeleton, Empty, SearchBar)   │
│  ├─ player/    (BasePlayer, HLSPlayer)       │
│  ├─ watch/     (WatchPlayer, EpisodeList)    │
│  ├─ watch-party/ (Party UI)                  │
│  └─ ui/        (55 Radix primitives)         │
├──────────────────────────────────────────────┤
│  Hooks (hooks/*)                             │
│  └─ Custom React hooks for state & data      │
├──────────────────────────────────────────────┤
│  Contexts (contexts/*)                       │
│  └─ Auth context (global state)              │
└──────────────────────────────────────────────┘
```

### Route Map (Planned)

| Route | Layout Group | Description |
|-------|-------------|-------------|
| `/` | (public) | Homepage |
| `/chu-de` | (public) | Topics/themes |
| `/the-loai` | (public) | Genres |
| `/the-loai/[slug]` | (public) | Genre detail |
| `/phim-le` | (public) | Movies (type: movie) |
| `/phim-bo` | (public) | Series (type: series) |
| `/quoc-gia` | (public) | Countries |
| `/quoc-gia/[slug]` | (public) | Country detail |
| `/dien-vien` | (public) | Actors |
| `/dien-vien/[slug]` | (public) | Actor detail |
| `/lich-chieu` | (public) | Schedule |
| `/reviews` | (public) | Reviews (reel) |
| `/reviews/[id]` | (public) | Review detail |
| `/movie/[id]` | (public) | Movie detail |
| `/watch/[id]` | (public) | Watch player |
| `/xem-chung` | (member) | Watch party list |
| `/xem-chung/[code]` | (member) | Watch party room |
| `/login` | (auth) | Login |
| `/signup` | (auth) | Signup |
| `/dashboard` | admin | Admin CMS |

---

## Data Flow

```
User Request
    │
    ▼
Next.js Middleware (auth guard for /dashboard)
    │
    ▼
Server Component / API Route
    │
    ├─ Auth check (lib/auth/session.ts)
    │
    ├─ Validation (lib/validators/)
    │
    ▼
Service Layer (lib/services/)
    │
    ├─ Check cache (lib/cache/)
    │   ├─ HIT → return cached data
    │   └─ MISS ↓
    │
    ├─ Repository (lib/repositories/) → Prisma → DB
    │
    ├─ External API (TMDB, OPhim) → services/tmdb/
    │
    ▼
Response (lib/api/handler.ts → unified JSON shape)
```

---

## Caching Strategy

| Data | TTL | Tag | Notes |
|------|-----|-----|-------|
| Homepage sections | 5 min | `homepage` | TMDB uses Next.js revalidate, DB uses AppCache |
| Taxonomy (genres, countries) | 1 hour | `taxonomy` | Rarely changes |
| Movie detail | 15 min | `movie` | Invalidated on update |
| Movie listings | 10 min | `movie` | Per page/filter |
| Reviews | 5 min | `review` | Invalidated on new review |
| Schedule | 5 min | `schedule` | Based on episode updates |
| Search suggestions | 2 min | — | Short TTL for freshness |

### Invalidation

- **Admin CRUD** → `cache.invalidateTag('movie')` after create/update/delete
- **New review** → `cache.invalidateTag('review')`
- **Taxonomy change** → `cache.invalidateTag('taxonomy')`
- **Manual** → Admin can call `cache.invalidateAll()` via admin API

---

## External Integrations

| Service | Purpose | Config |
|---------|---------|--------|
| **TMDB** | Movie metadata, images, trailers | `TMDB_API_KEY`, `TMDB_READ_ACCESS_TOKEN` |
| **OPhim** | Vietnamese movie catalog sync | Scripts in `scripts/` |
| **LiveKit** | Video/audio calls for watch party | `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |
| **Elasticsearch** | Full-text search (optional) | `ELASTICSEARCH_URL` |

---

*Last updated: Phase 1 refactoring*
