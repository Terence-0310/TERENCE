// ============================================
// seed-dashboard-demo.ts — temporary demo data for the admin dashboard
// ============================================
// Populates realistic PageView rows (upward trend) and PAID TopupOrder rows so
// "Lượt xem hôm nay", the growth chart, and "Doanh thu" show impressive,
// plausible numbers using the REAL users + movies already in the DB.
//
// Safe + reversible:
//   • Seeded PageViews are tagged userAgent = 'seed-demo'.
//   • Seeded orders use code prefix 'SEED_'.
//   • Re-running deletes the previous seed batch first (idempotent).
//   • Does NOT touch movie.viewCount, so nothing permanent is inflated.
//
// Usage (run on the box with DATABASE_URL set):
//   npx tsx src/dta/scripts/seed-dashboard-demo.ts          # 30 days (default)
//   npx tsx src/dta/scripts/seed-dashboard-demo.ts 14       # custom day count
//   npx tsx src/dta/scripts/seed-dashboard-demo.ts --clear  # only remove seed

import 'dotenv/config' // load .env from the current working directory
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SEED_UA = 'seed-demo'
const SEED_CODE_PREFIX = 'SEED_'

// How many days back to fill (default 30). Pass a bare number arg to override.
const dayArg = process.argv.find((a) => /^\d+$/.test(a))
const DAYS = dayArg ? parseInt(dayArg, 10) : 30

// Plausible top-up amounts (VND), weighted toward mid values by repetition.
const AMOUNTS = [49000, 99000, 99000, 149000, 149000, 199000, 299000, 500000]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// 0 (oldest) → 1 (today). Drives the upward growth trend.
function progressFor(daysAgo: number): number {
  return DAYS <= 1 ? 1 : (DAYS - 1 - daysAgo) / (DAYS - 1)
}

// Views for a given day — ramps 150 → 700/day with a weekend bump + noise.
function viewsForDay(daysAgo: number, dow: number): number {
  const base = 150 + progressFor(daysAgo) * 550
  const weekend = dow === 0 || dow === 6 ? 1.25 : 1
  const noise = 0.85 + Math.random() * 0.3
  return Math.max(1, Math.round(base * weekend * noise))
}

// PAID orders for a given day — ramps 5 → 18/day with noise.
function ordersForDay(daysAgo: number): number {
  const base = 5 + progressFor(daysAgo) * 13
  const noise = 0.8 + Math.random() * 0.4
  return Math.max(0, Math.round(base * noise))
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
    return new Date(start + Math.random() * Math.max(1, now - start))
  }
  return new Date(base.getTime() + Math.floor(Math.random() * 24 * 60 * 60 * 1000))
}

// createMany in chunks to stay under Postgres' parameter limit (65535).
async function createPageViewsChunked(rows: any[], chunk = 2000) {
  for (let i = 0; i < rows.length; i += chunk) {
    await prisma.pageView.createMany({ data: rows.slice(i, i + chunk) })
  }
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
      take: 60,
    }),
  ])

  if (movies.length === 0) {
    console.log('⚠️  No published movies found — cannot seed page views.')
    return
  }

  // Need a TCoinPackage to anchor the FK. Reuse the free-amount sentinel or any
  // active package; create the sentinel if none exists.
  let pkg = await prisma.tCoinPackage.findFirst({ where: { isActive: true } })
  if (!pkg) pkg = await prisma.tCoinPackage.findUnique({ where: { slug: 'free-amount' } })
  if (!pkg) {
    pkg = await prisma.tCoinPackage.create({
      data: { slug: 'free-amount', name: 'Nạp tự chọn', coinAmount: 0, bonusAmount: 0, priceVnd: 0, isActive: false, sortOrder: 9999 },
    })
  }

  // ── PageViews ──
  const pageViewRows: { path: string; movieId: string; userId: string | null; userAgent: string; createdAt: Date }[] = []
  for (let d = DAYS - 1; d >= 0; d--) {
    const sample = new Date()
    sample.setDate(sample.getDate() - d)
    const count = viewsForDay(d, sample.getDay())
    for (let i = 0; i < count; i++) {
      const movie = pick(movies)
      const userId = users.length > 0 && Math.random() < 0.7 ? pick(users).id : null
      pageViewRows.push({
        path: `/watch/${movie.slug || movie.id}`,
        movieId: movie.id,
        userId,
        userAgent: SEED_UA,
        createdAt: randomTimeInDay(d),
      })
    }
  }
  await createPageViewsChunked(pageViewRows)

  // ── PAID top-up orders ──
  const orderRows: any[] = []
  let revenue = 0
  let revenue7d = 0
  let seq = 0
  for (let d = DAYS - 1; d >= 0; d--) {
    if (users.length === 0) break
    const n = ordersForDay(d)
    for (let i = 0; i < n; i++) {
      const userId = pick(users).id
      const amountVnd = pick(AMOUNTS)
      const coinAmount = Math.floor(amountVnd / 100) // 10 coin / 1.000đ
      const when = randomTimeInDay(d)
      seq++
      const code = `${SEED_CODE_PREFIX}${when.getTime().toString(36).toUpperCase()}_${seq}`
      orderRows.push({
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
      })
      revenue += amountVnd
      if (d <= 6) revenue7d += amountVnd
    }
  }
  // Chunk orders too (≈12 fields/row → keep well under the param cap).
  for (let i = 0; i < orderRows.length; i += 2000) {
    await prisma.topupOrder.createMany({ data: orderRows.slice(i, i + 2000) })
  }

  const vnd = (n: number) => n.toLocaleString('vi-VN') + 'đ'
  console.log(`✅ Seeded ${pageViewRows.length} page views across ${DAYS} days`)
  console.log(`✅ Seeded ${orderRows.length} PAID orders — total ${vnd(revenue)} (7-day ${vnd(revenue7d)})`)
  console.log(`   Users: ${users.length} · Movies sampled: ${movies.length}`)
  console.log(`   Note: the dashboard chart shows the most recent 7 days; full ${DAYS}d lives in the DB.`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
