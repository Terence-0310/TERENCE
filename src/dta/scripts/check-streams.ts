import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  // All movies with episodes that have streamUrl
  const movies = await p.movie.findMany({
    where: {
      episodes: { some: { streamUrl: { not: null } } },
    },
    select: {
      title: true,
      slug: true,
      tmdbId: true,
      contentType: true,
      quality: true,
      _count: { select: { episodes: true } },
      episodes: {
        where: { streamUrl: { not: null } },
        select: { episodeNumber: true, episodeName: true, streamUrl: true, streamType: true },
        orderBy: { episodeNumber: 'asc' },
        take: 2, // just show first 2 eps as sample
      },
    },
    orderBy: { title: 'asc' },
  })

  console.log(`\n🎬 Phim có stream từ OPhim: ${movies.length} phim\n`)
  console.log('─'.repeat(90))

  movies.forEach((m, i) => {
    const streamDomain = m.episodes[0]?.streamUrl?.match(/https?:\/\/([^/]+)/)?.[1] || '?'
    console.log(`${i + 1}. ${m.title}`)
    console.log(`   Slug: ${m.slug} | TMDB: ${m.tmdbId || 'N/A'} | Loại: ${m.contentType || '?'} | Chất lượng: ${m.quality || '?'}`)
    console.log(`   Tổng tập: ${m._count.episodes} | Stream domain: ${streamDomain}`)
    console.log(`   URL mẫu: ${m.episodes[0]?.streamUrl?.substring(0, 80)}...`)
    console.log('')
  })

  // Also show movies with VideoSource records
  const vsMovies = await p.videoSource.findMany({
    include: {
      episode: {
        include: { movie: { select: { title: true, slug: true } } },
      },
    },
  })

  const uniqueVSMovies = new Map<string, { title: string; slug: string; count: number; type: string; url: string }>()
  vsMovies.forEach(vs => {
    const key = vs.episode.movie.slug
    if (!uniqueVSMovies.has(key)) {
      uniqueVSMovies.set(key, { title: vs.episode.movie.title, slug: key, count: 0, type: vs.sourceType, url: vs.url })
    }
    uniqueVSMovies.get(key)!.count++
  })

  console.log('─'.repeat(90))
  console.log(`\n📀 Phim có VideoSource records: ${uniqueVSMovies.size} phim\n`)
  uniqueVSMovies.forEach((v) => {
    console.log(`  • ${v.title} (${v.slug}) — ${v.count} source(s), type: ${v.type}`)
    console.log(`    URL: ${v.url.substring(0, 80)}`)
  })

  // Summary
  const totalMovies = await p.movie.count()
  const totalEps = await p.episode.count()
  const epsWithStream = await p.episode.count({ where: { streamUrl: { not: null } } })

  console.log('\n' + '─'.repeat(90))
  console.log(`\n📊 Tổng kết:`)
  console.log(`   Tổng phim trong DB: ${totalMovies}`)
  console.log(`   Tổng tập: ${totalEps}`)
  console.log(`   Tập có streamUrl: ${epsWithStream}`)
  console.log(`   Phim có stream: ${movies.length}`)

  await p.$disconnect()
}
main()
