import { prisma } from '@/src/be/shared/db/prisma'

async function main() {
  const movieCount = await prisma.movie.count({ where: { isActive: true, isPublished: true } })
  const epCount = await prisma.episode.count({ where: { isActive: true, isPublished: true } })
  const sourceCount = await prisma.videoSource.count({ where: { isActive: true } })
  const epWithStream = await prisma.episode.count({ where: { isActive: true, isPublished: true, streamUrl: { not: null } } })

  const sampleMovies = await prisma.movie.findMany({
    where: { isActive: true, isPublished: true },
    take: 3,
    select: {
      id: true, slug: true, title: true, tmdbId: true, year: true,
      episodes: {
        take: 2,
        where: { isActive: true, isPublished: true },
        select: {
          id: true, episodeNumber: true, episodeSlug: true,
          streamUrl: true, streamType: true,
          videoSources: { take: 3, select: { url: true, sourceType: true, isActive: true, isPrimary: true } },
        },
      },
    },
  })

  const reviewCount = await prisma.review.count()
  const reviewsByStatus = await prisma.review.groupBy({ by: ['status'], _count: { id: true } })

  console.log(JSON.stringify({
    movieCount, epCount, sourceCount, epWithStream,
    reviewCount, reviewsByStatus, sampleMovies,
  }, null, 2))
  process.exit(0)
}

main().catch(e => {
  console.error('PROBE FAILED:', e)
  process.exit(1)
})
