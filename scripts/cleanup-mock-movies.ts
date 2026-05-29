// Soft-delete seed mock movies that have no usable poster source.
// These pollute the top-view leaderboard because seed.ts gave them
// inflated viewCounts but no poster URLs.

import { prisma } from '@/src/be/shared/db/prisma'

async function main() {
  const where = {
    isActive: true,
    isPublished: true,
    deletedAt: null,
    posterUrl: null,
    thumbUrl: null,
    tmdbId: null,
  }

  const targets = await prisma.movie.findMany({
    where,
    select: { id: true, title: true, viewCount: true },
    orderBy: { viewCount: 'desc' },
  })

  if (targets.length === 0) {
    console.log('No movies to clean.')
    process.exit(0)
  }

  console.log(`Found ${targets.length} movies without any poster source:`)
  for (const m of targets) {
    console.log(`  - ${m.title} (views: ${m.viewCount})`)
  }

  const result = await prisma.movie.updateMany({
    where,
    data: {
      deletedAt: new Date(),
      isActive: false,
      isPublished: false,
    },
  })

  console.log(`\nSoft-deleted ${result.count} movies.`)
  process.exit(0)
}

main().catch(e => {
  console.error('Cleanup failed:', e)
  process.exit(1)
})
