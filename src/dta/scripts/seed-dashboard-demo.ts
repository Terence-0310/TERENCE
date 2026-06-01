// ============================================
// seed-dashboard-demo.ts — temporary demo data for the admin dashboard
// ============================================
// Populates realistic PageView rows (7-day upward trend) and a handful of PAID
// TopupOrder rows so "Lượt xem hôm nay", the growth chart, and "Doanh thu"
// show plausible numbers using the REAL users + movies already in the DB.
//
// Safe + reversible:
//   • Seeded PageViews are tagged userAgent = 'seed-demo'.
//   • Seeded orders use code prefix 'SEED_'.
//   • Re-running deletes the previous seed batch first (idempotent).
//   • Does NOT touch movie.viewCount, so nothing permanent is inflated.
//
// Usage (run on the box with DATABASE_URL set):
//   npx tsx src/dta/scripts/seed-dashboard-demo.ts
//   npx tsx src/dta/scripts/seed-dashboard-demo.ts --clear   # only remove seed
//
// PrismaClient reads DATABASE_URL from the environment.

import 'dotenv/config' // load .env from the current working directory
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SEED_UA = 'seed-demo'
const SEED_CODE_PREFIX = 'SEED_'

// Views per day, oldest → today (index 6 = today). Gentle upward trend.
const VIEWS_PER_DAY = [18, 24, 31, 29, 42, 55, 73]
// Number of PAID top-ups per day, oldest → today.
const ORDERS_PER_DAY = [1, 2, 1, 3, 2, 4, 3]
// Plausible top-up amounts (VND).
const AMOUNTS = [19000, 29000, 50000, 79000, 99000, 149000]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// A random Date inside the day that is `daysAgo` days before now.
// For today (daysAgo = 0) we cap at "now" so nothing lands in the future.
function randomTimeInDay(daysAgo: number): Date {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() - daysAgo)
  if (daysAgo === 0) {
    const now = Date.now()
    const start = base.getTime()
    return new Date(start + Math.random() * (now - start))
  }
  return new Date(base.getTime() + Math.floor(Math.random() * 24 * 60 * 60 * 1000))
}

async function clearSeed() {
  const [pv, ord] = await Promise.all([
    prisma.pageView.deleteMany({ where: { userAgent: SEED_UA } }),
    prisma.topupOrder.deleteMany({ where: { code: { startsWith: SEED_CODE_PREFIX } } }),
  ])
  console.log(`🧹 Removed previous seed: ${pv.count} page views, ${ord.count} orders`)
}

async function main() {
  const clearOnly = process.argv.includes('--clear')
  await clearSeed()
  if (clearOnly) {
    console.log('✅ Clear-only mode — done.')
    return
  }

  const [users, movies] = await Promise.all([
    prisma.user.findMany({ select: { id: true } }),
    prisma.movie.findMany({
      where: { deletedAt: null, status: 'published' },
      select: { id: true, slug: true },
      orderBy: { viewCount: 'desc' },
      take: 40,
    }),
  ])

  if (movies.length === 0) {
    console.log('⚠️  No published movies found — cannot seed page views.')
    return
  }

  // Need a TCoinPackage to anchor the FK. Reuse the free-amount sentinel or any
  // active package; create the sentinel if none exists.
  let pkg = await prisma.tCoinPackage.findFirst({ where: { isActive: true } })
  if (!pkg) {
    pkg = await prisma.tCoinPackage.findUnique({ where: { slug: 'free-amount' } })
  }
  if (!pkg) {
    pkg = await prisma.tCoinPackage.create({
      data: { slug: 'free-amount', name: 'Nạp tự chọn', coinAmount: 0, bonusAmount: 0, priceVnd: 0, isActive: false, sortOrder: 9999 },
    })
  }

  // ── PageViews ──
  const pageViewRows: { path: string; movieId: string; userId: string | null; userAgent: string; createdAt: Date }[] = []
  for (let d = 6; d >= 0; d--) {
    const daysAgo = d
    const count = VIEWS_PER_DAY[6 - d]
    for (let i = 0; i < count; i++) {
      const movie = pick(movies)
      // ~70% logged-in viewers, ~30% guests (userId null).
      const userId = users.length > 0 && Math.random() < 0.7 ? pick(users).id : null
      pageViewRows.push({
        path: `/watch/${movie.slug || movie.id}`,
        movieId: movie.id,
        userId,
        userAgent: SEED_UA,
        createdAt: randomTimeInDay(daysAgo),
      })
    }
  }
  await prisma.pageView.createMany({ data: pageViewRows })

  // ── PAID top-up orders ──
  let orderCount = 0
  let revenue = 0
  let seq = 0
  for (let d = 6; d >= 0; d--) {
    const n = ORDERS_PER_DAY[6 - d]
    for (let i = 0; i < n; i++) {
      if (users.length === 0) break
      const userId = pick(users).id
      const amountVnd = pick(AMOUNTS)
      const coinAmount = Math.floor(amountVnd / 100) // 10 coin / 1.000đ
      const when = randomTimeInDay(d)
      seq++
      const code = `${SEED_CODE_PREFIX}${when.getTime().toString(36).toUpperCase()}${seq}`
      await prisma.topupOrder.create({
        data: {
          code,
          userId,
          packageId: pkg.id,
          provider: 'BANK_QR',
          amountVnd,
          coinAmount,
          bonusAmount: 0,
          transferContent: code,
          status: 'PAID',
          matchedBankTxnId: `${SEED_CODE_PREFIX}TXN_${seq}_${when.getTime()}`,
          matchedBankAccount: '0385272094',
          matchedBankAmount: amountVnd,
          matchedBankContent: code,
          paidAt: when,
          expiresAt: new Date(when.getTime() + 15 * 60 * 1000),
          createdAt: when,
        },
      })
      orderCount++
      revenue += amountVnd
    }
  }

  console.log(`✅ Seeded ${pageViewRows.length} page views across 7 days`)
  console.log(`✅ Seeded ${orderCount} PAID orders — revenue ${revenue.toLocaleString('vi-VN')}đ`)
  console.log(`   Users: ${users.length} · Movies sampled: ${movies.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
