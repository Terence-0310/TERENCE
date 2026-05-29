# TERENCE — Project Structure (Modular Monolith)

> **Version**: 2.0 — Refactored March 2026  
> **Architecture**: Modular Monolith — Next.js App Router

---

## Directory Layout

```
TERENCE-main/
├── app/                          # Next.js App Router — Pages + Thin API Routes
│   ├── api/                      # API route handlers (thin wrappers → controllers)
│   │   ├── auth/                 # Auth endpoints
│   │   ├── admin/                # Admin CRUD endpoints
│   │   ├── movies/               # Public movie API
│   │   ├── news/                 # News API
│   │   ├── v1/                   # Versioned public API
│   │   ├── watch-party/          # Watch party REST API
│   │   ├── watch-rooms/          # Watch room management
│   │   ├── livekit/              # LiveKit token generation
│   │   └── socket/               # Socket.IO handshake
│   ├── browse/                   # Browse page
│   ├── dashboard/                # Admin dashboard
│   ├── movie/                    # Single movie page
│   ├── watch/                    # Watch player page
│   ├── xem-chung/                # Watch party page (Vietnamese)
│   ├── watch-together/           # Watch party page (English alias)
│   ├── tcoin/                    # TCoin virtual currency
│   ├── reviews/                  # Editorial reviews
│   ├── news/                     # News page
│   ├── login/                    # Login page
│   ├── signup/                   # Signup page
│   └── ...
│
├── src/
│   ├── server/                   # ⭐ SERVER-SIDE — Business Logic (Modular)
│   │   ├── modules/              # Domain modules
│   │   │   ├── auth/             # Authentication & Authorization
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.repository.ts
│   │   │   │   ├── auth.schema.ts
│   │   │   │   ├── auth.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── users/            # User management
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── users.repository.ts
│   │   │   │   ├── users.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── movies/           # Movies domain (CRUD, browse, search)
│   │   │   │   ├── movies.controller.ts
│   │   │   │   ├── movies.service.ts
│   │   │   │   ├── movies.repository.ts
│   │   │   │   ├── movies.mapper.ts
│   │   │   │   ├── movies.schema.ts
│   │   │   │   ├── movies.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── episodes/         # Episode management
│   │   │   │   ├── episodes.controller.ts
│   │   │   │   ├── episodes.service.ts
│   │   │   │   ├── episodes.repository.ts
│   │   │   │   ├── episodes.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── watch/            # Watch & Playback logic
│   │   │   │   ├── watch.controller.ts
│   │   │   │   ├── watch.service.ts
│   │   │   │   ├── watch.repository.ts
│   │   │   │   ├── watch.mapper.ts
│   │   │   │   ├── watch.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── reviews/          # Editorial reviews
│   │   │   │   ├── reviews.service.ts
│   │   │   │   ├── reviews.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── news/             # News aggregation
│   │   │   │   ├── news.controller.ts
│   │   │   │   ├── news.service.ts
│   │   │   │   ├── news.mapper.ts
│   │   │   │   ├── news.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── watch-party/      # Watch Party (rooms, sync, chat)
│   │   │   │   ├── watch-party.controller.ts
│   │   │   │   ├── watch-party.service.ts
│   │   │   │   ├── watch-party.repository.ts
│   │   │   │   ├── watch-party.schema.ts
│   │   │   │   ├── watch-party.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── tcoin/            # TCoin virtual currency (stub)
│   │   │   │   ├── tcoin.service.ts
│   │   │   │   ├── tcoin.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── payments/         # Payment integration (stub)
│   │   │   │   ├── payments.service.ts
│   │   │   │   ├── payments.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── admin/            # Admin dashboard queries
│   │   │   │   ├── admin.controller.ts
│   │   │   │   ├── admin.service.ts
│   │   │   │   ├── admin.guard.ts
│   │   │   │   ├── admin.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── uploads/          # File upload management
│   │   │   │   ├── uploads.service.ts
│   │   │   │   ├── uploads.types.ts
│   │   │   │   └── index.ts
│   │   │   └── analytics/        # Analytics & reporting (stub)
│   │   │       ├── analytics.service.ts
│   │   │       ├── analytics.types.ts
│   │   │       └── index.ts
│   │   │
│   │   └── shared/               # Shared server-side utilities
│   │       ├── db/
│   │       │   └── prisma.ts     # ⭐ Singleton PrismaClient — THE ONLY import point
│   │       ├── errors/
│   │       │   └── app-error.ts  # Base error classes
│   │       ├── guards/
│   │       │   └── require-auth.ts
│   │       └── utils/
│   │           └── slug.ts
│   │
│   ├── features/                 # ⭐ CLIENT-SIDE — Feature-specific hooks/state
│   │   ├── auth/                 # Auth context, hooks
│   │   ├── watch/                # Watch player hooks
│   │   ├── watch-party/          # Watch party client state
│   │   ├── news/                 # News hooks
│   │   └── tcoin/                # TCoin client hooks
│   │
│   └── components/               # ⭐ Shared UI Components (re-exports)
│       └── README.md             # Points to /components/ root
│
├── components/                   # Existing UI components (kept as-is)
│   ├── ui/                       # shadcn/ui primitives
│   ├── shared/                   # Shared presentational components
│   ├── home/                     # Homepage components
│   ├── player/                   # Player components
│   ├── watch/                    # Watch page components
│   ├── watch-party/              # Watch party components
│   └── news/                     # News components
│
├── hooks/                        # Existing React hooks (kept, will migrate to src/features)
├── contexts/                     # Existing React contexts (kept)
├── types/                        # Shared TypeScript types
├── lib/                          # OLD server logic (kept for backward compat)
│   ├── auth/                     # ⚠️ LEGACY — migrate to src/server/modules/auth
│   ├── db/                       # ⚠️ LEGACY — migrate to src/server/shared/db
│   ├── news/                     # ⚠️ LEGACY — migrate to src/server/modules/news
│   ├── tmdb/                     # ⚠️ LEGACY — external API helpers
│   ├── data/                     # ⚠️ LEGACY — static data
│   └── ...
│
├── server/                       # OLD server runtime (Socket.IO, services)
│   ├── watch-party/              # ⚠️ LEGACY — migrate to src/server/modules/watch-party
│   ├── services/                 # ⚠️ LEGACY — migrate to src/server/modules/watch
│   └── socket/                   # Socket.IO handlers (keep until migration)
│
├── services/                     # OLD external service wrappers
│   ├── tmdb/                     # ⚠️ LEGACY
│   └── video-source/             # ⚠️ LEGACY
│
├── prisma/
│   ├── schema.prisma             # Database schema
│   ├── migrations/               # Prisma migrations
│   └── seed.ts                   # Seed data
│
├── scripts/                      # CLI scripts (sync, enrich, pipeline)
├── deploy/                       # Deployment configs
├── docs/                         # Documentation
│   ├── architecture/             # Architecture docs
│   ├── api/                      # API documentation
│   ├── db/                       # Database documentation
│   └── prompts/                  # AI prompt templates
│
└── public/                       # Static assets
```

## Module Convention

Each module in `src/server/modules/<domain>/` follows this pattern:

| File | Role |
|---|---|
| `<domain>.controller.ts` | Handles HTTP request/response, calls service |
| `<domain>.service.ts` | Business logic, orchestrates repositories |
| `<domain>.repository.ts` | Prisma queries, data access |
| `<domain>.schema.ts` | Zod validation schemas |
| `<domain>.mapper.ts` | DB model → DTO transformations |
| `<domain>.types.ts` | TypeScript types/interfaces for the domain |
| `index.ts` | Barrel export |

## Migration Status

> **Note**: The original migration plan referenced `src/server/*` and `src/features/*` paths.
> The final convention adopted is `src/be/*` (backend) and `src/fe/features/*` (frontend features).
> Update other diagrams in this document accordingly when revisiting.

| Legacy Location | New Module | Status |
|---|---|---|
| `lib/auth/*` | `src/be/modules/auth` | ✅ Migrated |
| `lib/db/*` | `src/be/shared/db` | ✅ Migrated (singleton) |
| `src/server/movies/*` | `src/be/modules/movies` | ✅ Migrated |
| `server/watch-party/*` | `src/be/modules/watch-party` | ✅ Migrated |
| `server/services/*` | `src/be/modules/watch` | ✅ Migrated |
| `lib/news/*` | `src/be/modules/news` | ✅ Migrated |
| `lib/data/reviews.ts` | `src/be/modules/reviews` | ✅ Migrated |
| `lib/data/tcoin.ts` | `src/be/modules/tcoin` | ✅ Migrated |
| `lib/admin/*` | `src/be/modules/admin` | ✅ Migrated |
| `src/server/admin/*` | `src/be/modules/admin` | ✅ Migrated |
| `hooks/*` | `src/fe/features/<domain>/hooks` | ✅ Migrated (e.g. `src/fe/features/movies/hooks/useContinueWatching.ts`) |
| `contexts/*` | `src/fe/features/auth/contexts` | ✅ Migrated (`src/fe/features/auth/contexts/auth-context.tsx`) |
