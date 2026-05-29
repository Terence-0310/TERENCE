// Cleanup mock data from DB.
// Scope:
//  - Users with email matching `mockuser{1..10}@terence.vn` (Local Dev User N).
//  - Users from seed-mock-users.ts bulk seed (`<name>_<timestamp>_<i>@gmail.com`).
// Schema has onDelete: Cascade on every User→child relation, so deleting the
// user removes its wallet, transactions, topup orders, reviews, favorites,
// watch history, etc. in one shot.
//
// Run with `--dry` to print counts without deleting.
import { prisma } from '../src/be/shared/db/prisma'

const DRY = process.argv.includes('--dry')

const mockTerenceEmails = Array.from({ length: 10 }, (_, i) => `mockuser${i + 1}@terence.vn`)

;(async () => {
  // Bulk seed users have a 3-segment underscore pattern in the local part:
  // `<vnnamenodiacritics>_<numericTimestamp>_<index>@gmail.com`.
  // We match the timestamp+index suffix to avoid catching any real users
  // who happen to have a single underscore.
  const bulkSeedUsers = await prisma.user.findMany({
    where: {
      email: { contains: '_', endsWith: '@gmail.com' },
    },
    select: { id: true, email: true, name: true },
  })
  const bulkSeedFiltered = bulkSeedUsers.filter((u) => /_[0-9]{10,}_[0-9]+@gmail\.com$/.test(u.email))

  const targets = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: mockTerenceEmails } },
        { id: { in: bulkSeedFiltered.map((u) => u.id) } },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      _count: {
        select: {
          reviews: true,
          favorites: true,
          watchHistories: true,
          walletTransactions: true,
          topupOrders: true,
        },
      },
      wallet: { select: { balance: true } },
    },
  })

  console.log(`Found ${targets.length} mock user(s) to delete:`)
  for (const u of targets) {
    console.log(`  - ${u.email}  (${u.name})`)
    console.log(`      reviews=${u._count.reviews}  favorites=${u._count.favorites}  watchHistory=${u._count.watchHistories}  walletTx=${u._count.walletTransactions}  topupOrders=${u._count.topupOrders}  walletBalance=${u.wallet?.balance ?? 0}`)
  }

  if (DRY) {
    console.log('\n(dry-run — no rows deleted)')
    await prisma.$disconnect()
    return
  }

  if (targets.length === 0) {
    console.log('\nNothing to delete.')
    await prisma.$disconnect()
    return
  }

  const ids = targets.map((t) => t.id)
  const result = await prisma.user.deleteMany({ where: { id: { in: ids } } })
  console.log(`\nDeleted ${result.count} user(s). Cascade removed their reviews / wallets / transactions / topups / favorites / watch history.`)

  await prisma.$disconnect()
})().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
