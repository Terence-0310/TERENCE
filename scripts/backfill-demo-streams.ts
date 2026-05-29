// Backfill a demo HLS stream for every movie that has no playable episode.
//
// Why: ~54k movies on prod come from TMDB lazy-create (just metadata) and
// have no OPhim video source, so /watch shows a black HLS player. For a
// demo we want every movie clickable. This script creates exactly one
// Episode per source-less movie that points at Apple's public Mux test
// stream — a stable, embed-friendly HLS playlist.
//
// Operators: when real OPhim/CDN sources arrive for a movie, delete the
// demo Episode (sourceName='__demo_fallback') and re-run the OPhim sync.

import { prisma } from '../src/be/shared/db/prisma'

const DEMO_HLS = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
const DEMO_TAG = '__demo_fallback'

;(async () => {
  // Find movies that have ZERO episodes. We don't touch movies that already
  // have an OPhim episode — those play fine.
  const totalMovies = await prisma.movie.count()
  const moviesWithoutEp = await prisma.movie.findMany({
    where: { episodes: { none: {} } },
    select: { id: true, title: true, contentType: true },
  })
  console.log(`Total movies: ${totalMovies}`)
  console.log(`Movies missing any episode: ${moviesWithoutEp.length}`)

  if (moviesWithoutEp.length === 0) {
    console.log('Nothing to backfill.')
    await prisma.$disconnect()
    return
  }

  const CHUNK = 500
  let created = 0
  for (let i = 0; i < moviesWithoutEp.length; i += CHUNK) {
    const slice = moviesWithoutEp.slice(i, i + CHUNK)
    const rows = slice.map((m) => ({
      movieId: m.id,
      sourceName: DEMO_TAG,
      serverName: 'Demo',
      episodeName: 'Tập Full',
      episodeSlug: 'tap-full',
      episodeNumber: 1,
      episodeOrder: 0,
      title: 'Tập Full',
      slug: 'tap-full',
      streamType: 'hls',
      streamUrl: DEMO_HLS,
      sourceUrl: DEMO_HLS,
      isActive: true,
      isPublished: true,
      status: 'active',
    }))
    const r = await prisma.episode.createMany({ data: rows, skipDuplicates: true })
    created += r.count
    if ((i / CHUNK) % 10 === 0) {
      console.log(`  ... backfilled ${created}/${moviesWithoutEp.length}`)
    }
  }
  console.log(`\n✓ Created ${created} demo episode rows pointing at ${DEMO_HLS}`)
  await prisma.$disconnect()
})().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
