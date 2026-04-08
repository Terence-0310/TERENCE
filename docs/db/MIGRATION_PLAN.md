# TERENCE — Migration Plan (Schema v1 → v2)

> **Created**: 2026-03-31  
> **Strategy**: Non-destructive additive migration with data backfill

---

## Overview

Schema v2 introduces normalized tables (Genre, Favorite, Review, Wallet, etc.) while keeping **all existing String fields** intact for backward compatibility. No data is deleted or column types changed.

### Migration Phases

```
Phase 1: Schema Migration (DDL)          ← CURRENT
Phase 2: Data Backfill (DML)             ← Manual scripts
Phase 3: Code Migration (use new tables) ← Gradual
Phase 4: Cleanup (remove legacy fields)  ← Future
```

---

## Phase 1: Schema Migration (DDL) ✅

### New Tables Added

| Table | Purpose | Risk |
|-------|---------|------|
| `Genre` | Normalized genres (mirror of Category) | None — new table |
| `MovieGenre` | M:N pivot movie↔genre | None — new pivot |
| `Favorite` | User favorites | None — new table |
| `Review` | User reviews | None — new table |
| `NewsPost` | CMS articles | None — new table |
| `Wallet` | TCoin wallet per user | None — new table |
| `WalletTransaction` | Transaction ledger | None — new table |
| `PaymentOrder` | Payment orders | None — new table |

### Modified Tables

| Table | Change | Risk |
|-------|--------|------|
| `User` | Added `bio` field, `wallet` relation, `favorites`, `reviews` relations | None — nullable field addition |
| `Movie` | Added `genres` (MovieGenre), `favorites`, `reviews` relations | None — relation addition |
| `WatchPartyRoom` | Added `maxMembers` field | None — has default |
| `PageView` | Added `userId` field, path/movieId/createdAt indexes | None — nullable field |

### Kept Unchanged (Backward Compatible)

| Table | Notes |
|-------|-------|
| `Category` | Kept as-is — legacy code still reads this |
| `MovieCategory` | Kept as-is — legacy code still reads this |
| `Movie.actorText/directorText/countryText/categoryText` | Kept — used by existing serializers |
| All other models | Field names and types unchanged |

### How to Apply

```bash
# Validate schema
npx prisma validate

# Generate client
npx prisma generate

# Create migration (SQLite — use reset for dev)
npx prisma migrate dev --name schema-v2-normalized

# If migration fails (SQLite limitations), use:
npx prisma migrate reset --force
npx prisma db seed
```

---

## Phase 2: Data Backfill (DML)

### 2.1 Category → Genre Backfill

Copy all existing `Category` rows into `Genre` table, then backfill `MovieGenre` from `MovieCategory`.

```typescript
// scripts/migrate-category-to-genre.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function migrateCategoriesToGenres() {
  const categories = await prisma.category.findMany()
  
  for (const cat of categories) {
    const genre = await prisma.genre.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, tmdbId: cat.tmdbId, description: cat.description },
      create: {
        name: cat.name,
        slug: cat.slug,
        tmdbId: cat.tmdbId,
        description: cat.description,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
      },
    })

    // Backfill MovieGenre from MovieCategory
    const movieCategories = await prisma.movieCategory.findMany({
      where: { categoryId: cat.id },
    })
    for (const mc of movieCategories) {
      await prisma.movieGenre.upsert({
        where: { movieId_genreId: { movieId: mc.movieId, genreId: genre.id } },
        update: {},
        create: { movieId: mc.movieId, genreId: genre.id },
      })
    }
  }
  
  console.log(`Migrated ${categories.length} categories → genres`)
}
```

### 2.2 Movie.categoryText → Genre + MovieGenre

For movies that only have `categoryText` but no `MovieCategory` rows:

```typescript
async function migrateCategoryText() {
  const movies = await prisma.movie.findMany({
    where: { categoryText: { not: null } },
    include: { genres: true },
  })

  for (const movie of movies) {
    if (movie.genres.length > 0) continue // already linked
    if (!movie.categoryText) continue

    const names = movie.categoryText.split(',').map(s => s.trim())
    for (const name of names) {
      const genre = await prisma.genre.findFirst({
        where: { name: { equals: name } },
      })
      if (genre) {
        await prisma.movieGenre.upsert({
          where: { movieId_genreId: { movieId: movie.id, genreId: genre.id } },
          update: {},
          create: { movieId: movie.id, genreId: genre.id },
        })
      }
    }
  }
}
```

### 2.3 Movie.countryText → Country + MovieCountry

Same approach: split comma-separated text, match to Country by name, create pivot.

```typescript
async function migrateCountryText() {
  const movies = await prisma.movie.findMany({
    where: { countryText: { not: null } },
    include: { countries: true },
  })

  for (const movie of movies) {
    if (movie.countries.length > 0) continue
    if (!movie.countryText) continue

    const names = movie.countryText.split(',').map(s => s.trim())
    for (const name of names) {
      const country = await prisma.country.findFirst({
        where: { name: { equals: name } },
      })
      if (country) {
        await prisma.movieCountry.upsert({
          where: { movieId_countryId: { movieId: movie.id, countryId: country.id } },
          update: {},
          create: { movieId: movie.id, countryId: country.id },
        })
      }
    }
  }
}
```

### 2.4 Movie.actorText/directorText → Person + MoviePerson

```typescript
async function migratePersonText() {
  const movies = await prisma.movie.findMany({
    where: {
      OR: [
        { actorText: { not: null } },
        { directorText: { not: null } },
      ],
    },
    include: { people: true },
  })

  for (const movie of movies) {
    if (movie.people.length > 0) continue // already linked

    // Directors
    if (movie.directorText) {
      const names = movie.directorText.split(',').map(s => s.trim())
      for (const name of names) {
        if (!name) continue
        const slug = toSlug(name)
        const person = await prisma.person.upsert({
          where: { slug },
          update: {},
          create: { name, slug, knownFor: 'Directing' },
        })
        await prisma.moviePerson.upsert({
          where: { movieId_personId_role: { movieId: movie.id, personId: person.id, role: 'director' } },
          update: {},
          create: { movieId: movie.id, personId: person.id, role: 'director' },
        })
      }
    }

    // Actors
    if (movie.actorText) {
      const names = movie.actorText.split(',').map(s => s.trim())
      for (let i = 0; i < names.length; i++) {
        const name = names[i]
        if (!name) continue
        const slug = toSlug(name)
        const person = await prisma.person.upsert({
          where: { slug },
          update: {},
          create: { name, slug, knownFor: 'Acting' },
        })
        await prisma.moviePerson.upsert({
          where: { movieId_personId_role: { movieId: movie.id, personId: person.id, role: 'actor' } },
          update: {},
          create: { movieId: movie.id, personId: person.id, role: 'actor', sortOrder: i },
        })
      }
    }
  }
}

function toSlug(text: string): string {
  return text.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
```

### 2.5 Episode.sourceUrl/streamUrl → VideoSource

```typescript
async function migrateEpisodeSources() {
  const episodes = await prisma.episode.findMany({
    where: { streamUrl: { not: null } },
    include: { videoSources: true },
  })

  for (const ep of episodes) {
    if (ep.videoSources.length > 0) continue // already has sources
    if (!ep.streamUrl) continue

    const sourceType = ep.streamType === 'hls' || ep.streamType === 'm3u8' ? 'hls' : 'mp4'
    
    await prisma.videoSource.create({
      data: {
        episodeId: ep.id,
        sourceType,
        url: ep.streamUrl,
        label: ep.serverName || 'Main',
        isPrimary: true,
        isActive: ep.isActive,
        priority: 10,
        mimeType: sourceType === 'hls' ? 'application/x-mpegURL' : 'video/mp4',
      },
    })

    // Backup source if exists
    if (ep.backupSourceUrl) {
      await prisma.videoSource.create({
        data: {
          episodeId: ep.id,
          sourceType,
          url: ep.backupSourceUrl,
          label: 'Backup',
          isPrimary: false,
          isActive: ep.isActive,
          priority: 5,
        },
      })
    }
  }
}
```

---

## Phase 3: Code Migration

### Files That Need Update

| File / Area | Change Required | Priority |
|-------------|----------------|----------|
| `src/server/movies/movie-service.ts` | Add `genres: { include: { genre: true } }` alongside `categories` | HIGH |
| `src/server/movies/serializers.ts` | Read from `genres` relation in addition to `categories` | HIGH |
| `lib/db/movie-queries.ts` | Update scopes to include `genres` | HIGH |
| `app/api/admin/movies/*.ts` | Write to both `MovieGenre` and `MovieCategory` during create/update | MEDIUM |
| `components/` (card, detail) | No change — reads via API | NONE |
| `server/watch-party/*.ts` | No change — schema unchanged | NONE |
| `server/services/playback-service.ts` | No change — Episode/VideoSource unchanged | NONE |

### Recommended Approach for Movie Query Updates

```typescript
// Before (legacy)
const movie = await prisma.movie.findUnique({
  where: { slug },
  include: {
    categories: { include: { category: true } },
    // ...
  },
})

// After (v2 — dual read)
const movie = await prisma.movie.findUnique({
  where: { slug },
  include: {
    genres: { include: { genre: true } },       // ← NEW
    categories: { include: { category: true } }, // ← LEGACY (keep for compat)
    // ...
  },
})

// Serializer: prefer genres, fallback to categories
const genreNames = movie.genres.map(g => g.genre.name)
const categoryNames = movie.categories.map(c => c.category.name)
const displayGenres = genreNames.length > 0 ? genreNames : categoryNames
```

---

## Phase 4: Cleanup (Future)

After all code paths read from normalized tables:

1. Remove `Movie.actorText`, `Movie.directorText`, `Movie.countryText`, `Movie.categoryText`
2. Remove `Category` and `MovieCategory` models
3. Remove the `Movie.categories` relation
4. Update all imports and serializers

> ⚠️ **Do NOT do Phase 4 until you've verified all frontend and admin code reads from normalized tables only.**

---

## Rollback Strategy

If anything goes wrong:

1. **Schema**: The new schema is additive — no columns removed. Rolling back means simply removing the new tables in a reverse migration.
2. **Data**: No existing data is modified. New tables can be dropped.
3. **Code**: Legacy code continues to work during all phases since original fields and models are preserved.

```bash
# Emergency rollback
# 1. Revert schema.prisma to backup
# 2. Run:
npx prisma migrate dev --name rollback-v2
npx prisma generate
```
