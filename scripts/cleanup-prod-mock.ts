// Aggressive prod-only cleanup of mock data:
//   - Movies: title starts with "Phim Điện Ảnh Mock" OR originalTitle starts with "Movie Mock Series"
//   - Users:  bulk seed pattern `<name>_<10+digit-ts>_<idx>@gmail.com`
//             (matches scripts/seed-mock-users.ts exactly — does NOT touch
//             real Google accounts like anhtai9712@gmail.com)
//
// Cascade rules in schema.prisma auto-delete wallets, transactions, topups,
// reviews, favorites, watch history, etc. for any deleted user/movie.
//
// Run with --dry to preview; default executes deletes.

import { prisma } from '../src/be/shared/db/prisma'

const DRY = process.argv.includes('--dry')

;(async () => {
  // --- Step 1: count + delete mock movies
  const mockMovieWhere = {
    OR: [
      { title:         { startsWith: 'Phim Điện Ảnh Mock' } },
      { originalTitle: { startsWith: 'Movie Mock Series' } },
    ],
  }
  const mockMovieCount = await prisma.movie.count({ where: mockMovieWhere })

  // --- Step 2: identify bulk seed users via JS regex (Prisma can't do regex on Postgres
  //              without a raw query and we want type safety).
  const allEmails = await prisma.user.findMany({
    where: { email: { endsWith: '@gmail.com' } },
    select: { id: true, email: true },
  })
  const bulkRegex = /_[0-9]{10,}_[0-9]+@gmail\.com$/
  const bulkUserIds = allEmails.filter((u) => bulkRegex.test(u.email)).map((u) => u.id)

  console.log(`Will delete:`)
  console.log(`  - ${mockMovieCount} mock movies`)
  console.log(`  - ${bulkUserIds.length} bulk seed users (+ their wallets/tx/topups via cascade)`)

  if (DRY) {
    console.log('\n(dry-run — no rows deleted)')
    await prisma.$disconnect()
    return
  }

  if (mockMovieCount === 0 && bulkUserIds.length === 0) {
    console.log('\nNothing to delete.')
    await prisma.$disconnect()
    return
  }

  // Delete in chunks so a single huge transaction doesn't lock the table
  // for too long. Cascade rules handle the dependents.
  const CHUNK = 500

  // 1. movies (also cascades episodes/people/genres/countries/reviews/etc.)
  let moviesDeleted = 0
  if (mockMovieCount > 0) {
    // We can't easily chunk by id without listing them — but a single deleteMany
    // works in batches internally. For 8.5k rows this is fast enough.
    const r = await prisma.movie.deleteMany({ where: mockMovieWhere })
    moviesDeleted = r.count
    console.log(`✓ Deleted ${moviesDeleted} mock movies (and cascaded children)`)
  }

  // 2. users (chunked because there are 20k+)
  let usersDeleted = 0
  for (let i = 0; i < bulkUserIds.length; i += CHUNK) {
    const slice = bulkUserIds.slice(i, i + CHUNK)
    const r = await prisma.user.deleteMany({ where: { id: { in: slice } } })
    usersDeleted += r.count
    if ((i / CHUNK) % 10 === 0) {
      console.log(`  ... users deleted so far: ${usersDeleted}/${bulkUserIds.length}`)
    }
  }
  console.log(`✓ Deleted ${usersDeleted} bulk seed users (and cascaded wallets/tx/topups)`)

  await prisma.$disconnect()
})().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
