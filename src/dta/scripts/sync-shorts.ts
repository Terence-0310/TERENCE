// ============================================
// Shorts Sync CLI — import short videos for catalog movies
// ============================================
// Usage:
//   npm run shorts:sync                         # TMDB + catalog trailers (+ YouTube if YOUTUBE_API_KEY), 50 movies
//   npm run shorts:sync -- --limit=200 --perMovie=3
//   npm run shorts:sync -- --source=youtube     # only YouTube #shorts
//   npm run shorts:sync -- --all                # rescan movies that already have shorts
//   npm run shorts:sync -- --verify             # hide YouTube shorts that can no longer be embedded

import { syncShorts, verifyShorts } from '../../be/modules/shorts/shorts.service'
import { prisma } from '../../be/shared/db/prisma'
import { redis } from '../../lib/redis'

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
}

async function main() {
  if (process.argv.includes('--verify')) {
    const r = await verifyShorts(Number(arg('limit') ?? 1000))
    console.log(`✅ Shorts verify: checked ${r.checked}, hidden ${r.hidden} unembeddable`)
    return
  }
  const source = (arg('source') as 'tmdb' | 'youtube' | 'catalog' | 'all' | undefined) ?? 'all'
  const result = await syncShorts({
    source,
    limit: Number(arg('limit') ?? 50),
    perMovie: Number(arg('perMovie') ?? 2),
    onlyMissing: !process.argv.includes('--all'),
  })
  console.log(`✅ Shorts sync (${result.sources.join(', ')}): scanned ${result.moviesScanned} movies, created ${result.created}, skipped ${result.skipped}`)
}

main()
  .catch((err) => {
    console.error('❌ Shorts sync failed:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  // Close every handle (Redis is pulled in via the movie cache) so the CLI exits.
  .finally(async () => {
    await prisma.$disconnect()
    await redis?.quit().catch(() => {})
  })
