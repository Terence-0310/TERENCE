# TMDB Legacy — Migration Notes

This folder hosts the original TMDB client (`client.ts`, `config.ts`, `mapper.ts`, `index.ts`)
that pre-dated the newer service layer under `src/be/services/tmdb/*`. It is intentionally
kept for backward compatibility; do **not** add new code that imports from here.

## Why it still exists

A handful of consumer files were authored against the legacy module's named exports
(`client`, `mapper`, helper functions). Migrating them requires non-trivial work because
the legacy mapper coerces fields differently from the modern service (e.g. it tolerates
missing genres and language fallbacks the new service doesn't).

## Where it's still used (as of audit)

```
src/be/modules/news/tmdb-news.ts
src/be/modules/tmdb/tmdb-client.ts       (re-exports legacy client for downstream callers)
src/be/services/tmdb/movie-service.ts
src/be/services/tmdb/search-service.ts
src/be/services/tmdb/tv-service.ts
src/be/modules/news/mappers.ts
app/genres/page.tsx
app/people/page.tsx
app/person/[id]/page.tsx
tests/unit/tmdb-mapper.test.ts
```

## Sunset plan

1. Migrate the three `src/be/services/tmdb/*-service.ts` consumers first — they are the
   thinnest wrappers and the easiest to validate against test fixtures.
2. Replace `news/tmdb-news.ts` and `news/mappers.ts` usage by mapping through the new
   service's normalized DTOs.
3. Update the three `app/**` pages to consume the service layer.
4. Last: rewrite `tests/unit/tmdb-mapper.test.ts` to target the new mapper.
5. Delete `src/be/modules/tmdb/legacy/` once no references remain.

## Owner / hand-off

No fixed owner. Anyone touching TMDB-adjacent code should bias toward the modern service
and chip away at the migration list above when convenient.
