#!/usr/bin/env npx tsx
// ============================================
// Focused TMDB enrichment — non-mock movies only
// ============================================
// The seed data created ~8500 "Phim Điện Ảnh Mock N" placeholders that
// have no real TMDB equivalent. Running the standard `enrich:tmdb` over
// them wastes ~1.3s per movie on doomed search calls. This wrapper
// filters them out so the real 970-odd missing-tmdbId movies finish in
// 15-20 minutes instead of 6 hours.
//
// Usage:
//   npm run search:enrich-real
//   npm run search:enrich-real -- --delay=400

import { PrismaClient } from '@prisma/client'
import { enrichMovie, disconnect } from '../../be/modules/tmdb/tmdb-enrichment-service'

const prisma = new PrismaClient()

function getArg(name: string, def?: string): string | undefined {
  return process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? def
}

async function main() {
  const delay = parseInt(getArg('delay', '400') || '400', 10)
  const limit = parseInt(getArg('limit', '0') || '0', 10) || undefined

  console.log('╔══════════════════════════════════════════╗')
  console.log('║  TERENCE — Focused TMDB Enrichment       ║')
  console.log('╚══════════════════════════════════════════╝')

  // Real movies only — skip mock placeholders entirely. We also exclude
  // movies that already have tmdbId AND people (i.e. fully enriched),
  // because re-running cost much without value.
  const movies = await prisma.movie.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      tmdbId: null,
      AND: [
        { title: { not: { startsWith: 'Phim Điện Ảnh Mock' } } },
        { title: { not: { startsWith: 'Movie Mock' } } },
      ],
    },
    select: { id: true, title: true },
    orderBy: { viewCount: 'desc' },
    take: limit,
  })

  console.log(`  Movies to enrich: ${movies.length}`)
  console.log(`  Delay:            ${delay}ms`)
  console.log('')

  const t0 = Date.now()
  let enriched = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < movies.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, delay))

    try {
      const res = await enrichMovie(movies[i].id)
      if (res.action === 'enrich') enriched++
      else if (res.action === 'skip') skipped++
      else failed++
    } catch (err) {
      failed++
      console.error(`  ✗ ${movies[i].title}: ${err instanceof Error ? err.message : err}`)
    }

    if ((i + 1) % 20 === 0 || i === movies.length - 1) {
      const sec = ((Date.now() - t0) / 1000).toFixed(0)
      const rate = ((i + 1) / Math.max(1, Number(sec))).toFixed(2)
      const remaining = movies.length - (i + 1)
      const etaMin = (remaining / Math.max(0.01, Number(rate)) / 60).toFixed(1)
      console.log(`  [${i + 1}/${movies.length}] enriched=${enriched} skipped=${skipped} failed=${failed}  ${sec}s  ${rate}/s  ETA ${etaMin}m`)
    }
  }

  const sec = ((Date.now() - t0) / 1000).toFixed(1)
  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log(`  Done in ${sec}s`)
  console.log(`  Enriched: ${enriched}`)
  console.log(`  Skipped:  ${skipped}`)
  console.log(`  Failed:   ${failed}`)
  console.log('═══════════════════════════════════════════')
  console.log('')
  console.log('  Next:')
  console.log('    npm run search:sync-cast       # fill English aliases on the new persons')
  console.log('    npm run search:reindex         # rebuild the ES index')

  await disconnect()
  await prisma.$disconnect()
  process.exit(failed > 0 && enriched === 0 ? 1 : 0)
}

main()
