import { prisma } from '@/src/be/shared/db/prisma'

async function main() {
  const where = { isActive: true, isPublished: true, status: 'published' as const }

  const [
    total,
    withLocalPoster,
    withTmdbOnly,
    noPoster,
    mockDemo,
  ] = await Promise.all([
    prisma.movie.count({ where }),
    prisma.movie.count({
      where: { ...where, OR: [{ posterUrl: { not: null } }, { thumbUrl: { not: null } }] },
    }),
    prisma.movie.count({
      where: { ...where, posterUrl: null, thumbUrl: null, tmdbId: { not: null } },
    }),
    prisma.movie.count({
      where: { ...where, posterUrl: null, thumbUrl: null, tmdbId: null },
    }),
    prisma.movie.count({
      where: { title: { contains: 'PHIM LOCAL DEMO' } },
    }),
  ])

  // Top 10 by viewCount, regardless of poster
  const top10 = await prisma.movie.findMany({
    where,
    select: { title: true, viewCount: true, posterUrl: true, thumbUrl: true, tmdbId: true },
    orderBy: { viewCount: 'desc' },
    take: 10,
  })

  console.log(JSON.stringify({
    counts: { total, withLocalPoster, withTmdbOnly, noPoster, mockDemo },
    top10: top10.map(m => ({
      title: m.title,
      views: m.viewCount,
      hasPoster: !!(m.posterUrl || m.thumbUrl),
      hasTmdb: !!m.tmdbId,
    })),
  }, null, 2))
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
