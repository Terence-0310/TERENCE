#!/usr/bin/env npx tsx
// ============================================
// Subtitle → Elasticsearch sync (background)
// ============================================
// For every Movie that has at least one active SubtitleTrack, download
// the .vtt file, parse out the dialogue text, and push it to ES as a
// partial update on the `subtitleText` / `subtitleTextAscii` fields.
//
// Why separate from `reindexAll`:
//   - Subtitle .vtt files live on remote hosts; one network roundtrip
//     per track at ~50KB each. 15 000 movies × ~3s/track = hours.
//   - The main reindex must stay fast (run in seconds), and a Movie
//     row update should NOT block on the subtitle CDN.
//
// Usage:
//   npm run search:sync-subtitles                # all movies w/ subs
//   npm run search:sync-subtitles -- --limit=200
//   npm run search:sync-subtitles -- --movieId=xxx
//   npm run search:sync-subtitles -- --concurrency=8

import { PrismaClient } from '@prisma/client'
import { getClient, getMoviesIndex, isAvailable, closeClient } from '../../be/modules/search/elastic-client'
import { normalizeVietnamese } from '@/lib/search/normalize'
import { logger } from '@/src/be/shared/utils/logger'

const prisma = new PrismaClient()
const log = logger.child({ module: 'sync-subtitles' })

// ─── .vtt parser ────────────────────────────────────────────────
// Strip the WEBVTT header, cue numbers, and timestamp lines, leaving
// only the spoken text. Collapses repeated whitespace.
function parseVtt(raw: string): string {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  for (const ln of lines) {
    const trimmed = ln.trim()
    if (!trimmed) continue
    if (trimmed === 'WEBVTT' || trimmed.startsWith('WEBVTT ')) continue
    if (trimmed.startsWith('NOTE')) continue
    if (/^\d+$/.test(trimmed)) continue            // cue number
    if (trimmed.includes('-->')) continue          // timestamp
    if (trimmed.startsWith('STYLE') || trimmed.startsWith('REGION')) continue
    // Remove inline cue tags like <v Speaker> or <c.classname>.
    out.push(trimmed.replace(/<[^>]+>/g, ''))
  }
  return out.join(' ').replace(/\s+/g, ' ').trim()
}

async function fetchSubtitle(url: string, timeoutMs = 5000): Promise<string | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) return null
    const text = await res.text()
    // Cap individual subtitle dump so a single huge file doesn't blow
    // the doc size budget. 60KB of dialogue ≈ 2hr of speech, plenty.
    return text.length > 200_000 ? text.slice(0, 200_000) : text
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

// ─── Per-movie sync ─────────────────────────────────────────────

async function syncMovie(movieId: string): Promise<{ ok: boolean; chars: number }> {
  // Reach subtitle tracks via Episode → SubtitleTrack. Each Episode of
  // a movie can have multiple language tracks; we concatenate them all
  // so phrase search hits regardless of which language the user typed.
  const tracks = await prisma.subtitleTrack.findMany({
    where: { isActive: true, episode: { movieId } },
    select: { url: true, lang: true },
    // Pull a reasonable cap; we only need text, not every duplicate.
    take: 10,
  })
  if (tracks.length === 0) return { ok: true, chars: 0 }

  const blobs: string[] = []
  for (const t of tracks) {
    if (!t.url || !t.url.startsWith('http')) continue
    const raw = await fetchSubtitle(t.url)
    if (!raw) continue
    blobs.push(parseVtt(raw))
  }

  const subtitleText = blobs.join(' \n ').slice(0, 250_000) // cap total
  if (!subtitleText) return { ok: true, chars: 0 }

  const client = getClient()
  await client.update({
    index: getMoviesIndex(),
    id: movieId,
    doc: {
      subtitleText,
      subtitleTextAscii: normalizeVietnamese(subtitleText),
    },
  })
  return { ok: true, chars: subtitleText.length }
}

// ─── Concurrency-limited runner ─────────────────────────────────
async function runWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++
      try {
        await fn(items[idx])
      } catch (err) {
        log.warn({ err: err instanceof Error ? err.message : err, item: items[idx] }, 'sync worker error')
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
  const concurrency = parseInt(get('concurrency') || '4', 10)

  console.log('╔══════════════════════════════════════════╗')
  console.log('║   TERENCE — Subtitle → ES sync           ║')
  console.log('╚══════════════════════════════════════════╝')

  if (!(await isAvailable())) {
    console.error('❌ Elasticsearch is not available.')
    process.exit(1)
  }

  // Pick movies to sync — those that actually have at least one active
  // SubtitleTrack. Without this gate we'd hit Prisma 15 000 times for
  // nothing.
  const candidates: Array<{ id: string; title: string }> = movieId
    ? (await prisma.movie.findMany({ where: { id: movieId }, select: { id: true, title: true } }))
    : (await prisma.movie.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          episodes: { some: { subtitleTracks: { some: { isActive: true } } } },
        },
        select: { id: true, title: true },
        orderBy: { viewCount: 'desc' },
        take: limit || undefined,
      }))

  console.log(`  Candidates: ${candidates.length}`)
  console.log(`  Concurrency: ${concurrency}`)
  console.log('')

  const t0 = Date.now()
  let done = 0
  let withText = 0
  let totalChars = 0
  let errors = 0

  await runWithConcurrency(candidates, concurrency, async (m) => {
    try {
      const res = await syncMovie(m.id)
      done++
      if (res.chars > 0) {
        withText++
        totalChars += res.chars
      }
      if (done % 20 === 0 || done === candidates.length) {
        const sec = ((Date.now() - t0) / 1000).toFixed(0)
        console.log(`  [${done}/${candidates.length}] textful=${withText} totalKB=${(totalChars / 1024).toFixed(0)} ${sec}s`)
      }
    } catch (e) {
      errors++
      log.warn({ err: e instanceof Error ? e.message : e, movieId: m.id }, 'sync failed')
    }
  })

  const sec = ((Date.now() - t0) / 1000).toFixed(1)
  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log(`  Done in ${sec}s`)
  console.log(`  Processed:  ${done}`)
  console.log(`  With text:  ${withText}`)
  console.log(`  Errors:     ${errors}`)
  console.log(`  Total chars indexed: ${totalChars.toLocaleString()}`)
  console.log('═══════════════════════════════════════════')

  await closeClient()
  await prisma.$disconnect()
  process.exit(errors > 0 && withText === 0 ? 1 : 0)
}

main()
