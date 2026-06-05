#!/usr/bin/env npx tsx
// ============================================
// TMDB → Person / MoviePerson sync
// ============================================
// Populates the cast/crew tables that the rest of the codebase reads
// from. Without this step the search index has no actor data — every
// "search by actor" query falls through to title fuzzy noise.
//
// For each Movie with a tmdbId:
//   1. GET /movie/{id}/credits  or  /tv/{id}/credits  via the existing
//      tmdb-client (which already handles rate-limit retries).
//   2. Take the top N cast (sorted by `order`) and the director.
//   3. Upsert into Person (by tmdbId), then upsert MoviePerson rows.
//
// Concurrency-limited so we don't slam TMDB. With 4 workers and a free
// TMDB key, ~15 000 movies sync in ~10 minutes.
//
// Usage:
//   npm run search:sync-cast                # default: all movies, 4 workers, 10 cast each
//   npm run search:sync-cast -- --limit=500
//   npm run search:sync-cast -- --movieId=xxx
//   npm run search:sync-cast -- --castPerMovie=15 --concurrency=6

import { PrismaClient } from '@prisma/client'
import { getCredits } from '../../be/modules/tmdb/tmdb-client'
import { tmdbFetch } from '../../be/modules/tmdb/legacy/client'
import { logger } from '../../be/shared/utils/logger'
import type { TmdbCreditsResponse } from '../../be/modules/tmdb/types'

const prisma = new PrismaClient()
const log = logger.child({ module: 'sync-cast' })

// English credits fetch — used as a second pass so we capture the
// actor's Latin / English name even when the primary vi-VN call returns
// a localised one ("Ngô Kinh" instead of "Wu Jing"). We merge results
// keyed by TMDB person id so the final Person row has both spellings.
async function getCreditsEn(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<TmdbCreditsResponse | null> {
  try {
    return await tmdbFetch<TmdbCreditsResponse>(`/${mediaType}/${tmdbId}/credits`, { language: 'en-US' })
  } catch {
    return null
  }
}

// ─── Slug helper (used only when TMDB returns no slug for the person) ──
function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

// Ensures every (Person.tmdbId, Person.slug) pair stays unique even
// when two people share a normalised name. We append the tmdbId to
// the slug so collisions are deterministic and idempotent.
function personSlug(name: string, tmdbId: number): string {
  const base = slugify(name) || 'person'
  return `${base}-${tmdbId}`
}

// ─── Per-movie sync ─────────────────────────────────────────────

interface SyncOpts { castPerMovie: number }

async function syncMovieCast(movie: { id: string; tmdbId: number; contentType: string }, opts: SyncOpts): Promise<{ inserted: number; skipped?: string }> {
  // TMDB media type — schema stores 'movie' or 'series'; the API path is /movie or /tv.
  const mediaType: 'movie' | 'tv' = movie.contentType === 'series' ? 'tv' : 'movie'

  let credits
  try {
    credits = await getCredits(movie.tmdbId, mediaType)
  } catch (err) {
    return { inserted: 0, skipped: `TMDB error: ${err instanceof Error ? err.message : err}` }
  }

  if (!credits) return { inserted: 0, skipped: 'no credits returned' }

  // Second pass — pull the same credits in English so we can record the
  // Latin/English spelling alongside the Vietnamese one. TMDB returns
  // `name` localised but `original_name` is in the actor's NATIVE script
  // (Chinese for Donnie Yen, Russian for Bondarchuk, etc.), so we need
  // an explicit `en-US` call to get reliable English spellings.
  // Build a map: tmdbPersonId → englishName.
  const englishCredits = await getCreditsEn(movie.tmdbId, mediaType)
  const englishNameByTmdbId = new Map<number, string>()
  if (englishCredits) {
    for (const c of englishCredits.cast || []) {
      if (c?.id && c?.name) englishNameByTmdbId.set(c.id, c.name)
    }
    for (const c of englishCredits.crew || []) {
      if (c?.id && c?.name) englishNameByTmdbId.set(c.id, c.name)
    }
  }

  // Top-N cast by `order` field (already 0-indexed from TMDB).
  // Dedupe by person id first — TMDB occasionally lists the same actor
  // twice (e.g. credited for two characters), which would otherwise
  // collide on the (movieId, personId, role) unique key and roll back the
  // whole per-movie transaction.
  const dedupeById = <T extends { id: number }>(arr: T[]): T[] => {
    const seen = new Set<number>()
    return arr.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)))
  }
  const topCast = dedupeById(
    (credits.cast || [])
      .filter((c) => c && c.id && c.name)
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  ).slice(0, opts.castPerMovie)

  // First director(s) from crew — deduped so a person credited as Director
  // more than once doesn't collide on the unique key.
  const directors = dedupeById((credits.crew || []).filter((c) => c?.job === 'Director' && c?.id && c?.name))

  if (topCast.length === 0 && directors.length === 0) {
    return { inserted: 0, skipped: 'empty cast and crew' }
  }

  let inserted = 0

  // Wrap in a single transaction so a partial failure doesn't leave
  // half-populated MoviePerson rows for this film.
  await prisma.$transaction(async (tx) => {
    // Clear existing MoviePerson rows for this movie so re-runs are
    // idempotent (no duplicate entries if cast changed upstream).
    await tx.moviePerson.deleteMany({ where: { movieId: movie.id } })

    for (let i = 0; i < topCast.length; i++) {
      const c = topCast[i]
      // Prefer the English credits result for `originalName` so it acts
      // as a Latin-script alias users can search ("Wu Jing" → Ngô Kinh).
      // Fall back to TMDB's native-script `original_name` only when the
      // English pass didn't return this person.
      const englishName = englishNameByTmdbId.get(c.id)
      const aliasName = englishName && englishName !== c.name ? englishName : (c.original_name || null)
      const person = await tx.person.upsert({
        where: { tmdbId: c.id },
        create: {
          tmdbId: c.id,
          name: c.name,
          originalName: aliasName,
          slug: personSlug(c.name, c.id),
          profileUrl: c.profile_path,
          gender: c.gender || null,
          knownFor: c.known_for_department || null,
          popularity: c.popularity || 0,
        },
        update: {
          name: c.name,
          originalName: aliasName,
          profileUrl: c.profile_path,
          popularity: c.popularity || 0,
        },
      })

      await tx.moviePerson.create({
        data: {
          movieId: movie.id,
          personId: person.id,
          role: 'actor',
          character: c.character || null,
          sortOrder: c.order ?? i,
        },
      })
      inserted++
    }

    for (const d of directors.slice(0, 2)) {
      const englishName = englishNameByTmdbId.get(d.id)
      const aliasName = englishName && englishName !== d.name ? englishName : (d.original_name || null)
      const person = await tx.person.upsert({
        where: { tmdbId: d.id },
        create: {
          tmdbId: d.id,
          name: d.name,
          originalName: aliasName,
          slug: personSlug(d.name, d.id),
          profileUrl: d.profile_path,
          gender: d.gender || null,
          knownFor: d.known_for_department || null,
          popularity: d.popularity || 0,
        },
        update: {
          name: d.name,
          originalName: aliasName,
          profileUrl: d.profile_path,
          popularity: d.popularity || 0,
        },
      })

      await tx.moviePerson.create({
        data: {
          movieId: movie.id,
          personId: person.id,
          role: 'director',
          department: d.department || null,
          job: d.job || null,
        },
      })
      inserted++
    }
  })

  return { inserted }
}

// ─── Concurrency runner ─────────────────────────────────────────

async function runWithConcurrency<T>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<void>) {
  let i = 0
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++
      try {
        await fn(items[idx], idx)
      } catch (err) {
        log.warn({ err: err instanceof Error ? err.message : err }, 'worker error')
      }
    }
  })
  await Promise.all(workers)
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const get = (n: string) => args.find((x) => x.startsWith(`--${n}=`))?.split('=')[1]
  const limit = parseInt(get('limit') || '0', 10) || 0
  const movieId = get('movieId')
  const castPerMovie = parseInt(get('castPerMovie') || '10', 10)
  const concurrency = parseInt(get('concurrency') || '4', 10)
  // --publishedOnly: restrict to the search-visible catalog (skip drafts).
  // --missingOnly:   skip movies that already have cast/crew rows, so a
  //                  backfill over a large catalog only spends TMDB calls
  //                  on the films that actually need them. Both are idempotent.
  const publishedOnly = args.includes('--publishedOnly')
  const missingOnly = args.includes('--missingOnly')

  console.log('╔══════════════════════════════════════════╗')
  console.log('║  TERENCE — Cast sync from TMDB           ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(`  publishedOnly=${publishedOnly}  missingOnly=${missingOnly}`)

  const movies = await prisma.movie.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      tmdbId: { not: null },
      ...(publishedOnly ? { status: 'published' } : {}),
      ...(missingOnly ? { people: { none: {} } } : {}),
      ...(movieId ? { id: movieId } : {}),
    },
    select: { id: true, tmdbId: true, contentType: true, title: true },
    // Sort most-watched first so smoke runs (with --limit) cover the
    // films users actually browse. Movie.popularity doesn't exist —
    // the schema only stores viewCount + rating.
    orderBy: [{ viewCount: 'desc' }, { rating: 'desc' }],
    take: limit || undefined,
  })

  console.log(`  Movies to process: ${movies.length}`)
  console.log(`  Cast per movie:    ${castPerMovie}`)
  console.log(`  Concurrency:       ${concurrency}`)
  console.log('')

  const t0 = Date.now()
  let processed = 0
  let inserted = 0
  let skipped = 0
  let errors = 0

  await runWithConcurrency(movies, concurrency, async (m) => {
    if (!m.tmdbId) return
    try {
      const res = await syncMovieCast({ id: m.id, tmdbId: m.tmdbId, contentType: m.contentType }, { castPerMovie })
      processed++
      inserted += res.inserted
      if (res.skipped) skipped++
    } catch (err) {
      errors++
      log.warn({ err: err instanceof Error ? err.message : err, movieId: m.id }, 'sync failed')
    }
    if (processed % 50 === 0 || processed === movies.length) {
      const sec = ((Date.now() - t0) / 1000).toFixed(0)
      console.log(`  [${processed}/${movies.length}] inserted=${inserted} skipped=${skipped} errors=${errors}  ${sec}s`)
    }
  })

  const sec = ((Date.now() - t0) / 1000).toFixed(1)
  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log(`  Done in ${sec}s`)
  console.log(`  Processed:        ${processed}`)
  console.log(`  Rows inserted:    ${inserted}`)
  console.log(`  Skipped (empty):  ${skipped}`)
  console.log(`  Errors:           ${errors}`)
  console.log('═══════════════════════════════════════════')
  console.log('')
  console.log('  Next: rebuild the ES index so actor search picks up the new data:')
  console.log('    npm run search:reindex')

  await prisma.$disconnect()
  process.exit(errors > 0 && inserted === 0 ? 1 : 0)
}

main()
