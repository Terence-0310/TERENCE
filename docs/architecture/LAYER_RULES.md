# TERENCE — Layer Rules & Architecture Constraints

> **Version**: 2.0 — March 2026  
> **Pattern**: Modular Monolith with strict layer separation

---

## Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (Browser)                                     │
│  app/**/page.tsx  ·  components/*  ·  hooks/*            │
│  contexts/*  ·  src/features/*                          │
├─────────────────────────────────────────────────────────┤
│  ↓ fetch() / SWR                                        │
├─────────────────────────────────────────────────────────┤
│  API ROUTE (Thin Handler)                               │
│  app/api/**/route.ts                                    │
│  - Parses request (params, body, headers)                │
│  - Calls controller                                     │
│  - Returns NextResponse                                 │
├─────────────────────────────────────────────────────────┤
│  ↓                                                      │
├─────────────────────────────────────────────────────────┤
│  CONTROLLER                                             │
│  src/server/modules/<domain>/<domain>.controller.ts      │
│  - Validates input (Zod schemas)                        │
│  - Calls service methods                                │
│  - Maps results to response DTOs                        │
│  - Handles errors with standard error responses         │
├─────────────────────────────────────────────────────────┤
│  ↓                                                      │
├─────────────────────────────────────────────────────────┤
│  SERVICE                                                │
│  src/server/modules/<domain>/<domain>.service.ts         │
│  - Business logic & rules                               │
│  - Orchestrates one or more repositories                │
│  - May call other services (cross-module)               │
│  - Never imports NextResponse or React                  │
├─────────────────────────────────────────────────────────┤
│  ↓                                                      │
├─────────────────────────────────────────────────────────┤
│  REPOSITORY                                             │
│  src/server/modules/<domain>/<domain>.repository.ts      │
│  - Prisma queries only                                  │
│  - No business logic                                    │
│  - Always uses src/server/shared/db/prisma singleton     │
│  - Returns raw Prisma types                             │
├─────────────────────────────────────────────────────────┤
│  ↓                                                      │
├─────────────────────────────────────────────────────────┤
│  DATABASE                                               │
│  prisma/schema.prisma → SQLite / PostgreSQL             │
└─────────────────────────────────────────────────────────┘
```

---

## Rules

### Rule 1: Call Direction — Top-to-Bottom Only

```
route → controller → service → repository → prisma
```

- **Route** may call **Controller** (or directly call Service for simple cases)
- **Controller** calls **Service**
- **Service** calls **Repository** (same domain) or other **Services** (cross-domain)
- **Repository** uses **Prisma Client** only
- **Never go upward**: Repository must not call Service. Service must not render UI.

### Rule 2: FE Never Touches DB

| ✅ Allowed | ❌ Forbidden |
|---|---|
| `components/` → `fetch('/api/...')` | `components/` → `import { prisma }` |
| `hooks/` → `useSWR('/api/...')` | `hooks/` → `import { prisma }` |
| `app/**/page.tsx` → `fetch()` | `app/**/page.tsx` → `prisma.movie.findMany()` |
| Server Components → call service | Client Components → import repository |

**Frontend components and hooks communicate with the backend exclusively via HTTP API calls** (`fetch`, `SWR`, etc.) or by calling server-side functions from Server Components.

### Rule 3: Service Never Renders UI

- `src/server/modules/**` must **never** import React, JSX, or UI components
- Services are pure business logic — they return data, throw errors, or perform side effects
- If a service needs to send a notification, it should delegate to a notification service, not render a component

### Rule 4: Single Prisma Entry Point

All Prisma imports must flow through the singleton:

```typescript
// ✅ Correct
import { prisma } from '@/src/server/shared/db/prisma'

// ❌ Wrong — direct PrismaClient instantiation
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// ⚠️ Legacy — still works but should migrate
import { prisma } from '@/lib/auth/db'
import { prisma } from '@/lib/db/prisma'
```

### Rule 5: Module Independence

- Each module in `src/server/modules/<domain>/` should be **self-contained**
- Cross-module dependency is through **service-to-service** calls, never direct repository imports
- Example: `watch-party.service` may call `movies.service.getMovieById()`, but should not import `movies.repository`

### Rule 6: Schema Validation at the Edge

- All external input (HTTP request body, query params) must be validated using **Zod schemas**
- Schemas live in `<domain>.schema.ts`
- Validation happens in the **Controller** or **Route Handler**, never in the Repository

### Rule 7: API Routes Are Thin

API route files (`app/api/**/route.ts`) should contain **minimal logic**:

```typescript
// ✅ Good — thin route handler
export async function POST(req: NextRequest) {
  const body = await req.json()
  return AuthController.login(body)
}

// ❌ Bad — business logic in route
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  const user = await prisma.user.findUnique({ where: { email } })
  const valid = await bcrypt.compare(password, user.passwordHash)
  // ... 50 more lines of logic
}
```

---

## Migration Guidelines

> **Status (2026-05)**: All three phases below are complete. Backend modules live under
> `src/be/modules/*`, the Prisma singleton under `src/be/shared/db/prisma.ts`, and the
> frontend feature modules under `src/fe/features/*`. This section is kept as a reference
> for the migration history — no further migration work is pending.

### Phase 1: Scaffold ✅

- Module skeletons under `src/be/modules/*` created with re-exports from legacy locations.

### Phase 2: Migrate ✅

- Actual logic moved out of `lib/`, `services/`, `server/` into the new module files.
- API routes import from `@/src/be/modules/*` (controllers/services/repositories).

### Phase 3: Clean Up ✅

- Legacy directories removed where consumers no longer reference them.
- No direct Prisma imports outside repositories (enforced by code review).

---

## Migration Markers (historical)

During Phases 1–2, `// TODO [MIGRATION]` markers were placed in code to flag relocations,
e.g.:

```typescript
// TODO [MIGRATION] Move this logic to src/be/modules/auth/auth.service.ts
// TODO [MIGRATION] Replace direct prisma import with repository method
// TODO [MIGRATION] Move Zod schema to src/be/modules/<domain>/<domain>.schema.ts
```

These markers have all been resolved and removed from the codebase. If you reintroduce a
similar marker, follow the same `// TODO [MIGRATION] <action>` format so it can be grepped.
