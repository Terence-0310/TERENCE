const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const movies = await p.movie.count()
  const episodes = await p.episode.count()
  const withStream = await p.episode.count({ where: { streamUrl: { not: null } } })
  console.log(`Movies: ${movies}, Episodes: ${episodes}, WithStream: ${withStream}`)
  
  // Sample movies with streams
  const sample = await p.movie.findMany({
    where: { episodes: { some: { streamUrl: { not: null } } } },
    select: { title: true, slug: true },
    take: 5,
  })
  sample.forEach(m => console.log(`  - ${m.title} (${m.slug})`))
  
  await p.$disconnect()
}
main()
