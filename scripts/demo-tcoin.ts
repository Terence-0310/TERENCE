// ============================================
// TCoin Smoke Test — calls every TCoin endpoint
// as a real authenticated user and prints results.
// ============================================
// Usage: npx tsx scripts/demo-tcoin.ts [email]
// Defaults to ntai9712@gmail.com.

import { encode } from 'next-auth/jwt'
import { prisma } from '../src/be/shared/db/prisma'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const SECRET = process.env.NEXTAUTH_SECRET
if (!SECRET) {
  console.error('NEXTAUTH_SECRET missing — set it in .env')
  process.exit(1)
}

const email = process.argv[2] || 'ntai9712@gmail.com'

// next-auth cookie name in JWT strategy + http (dev).
const COOKIE_NAME = 'next-auth.session-token'

function fmt(obj: unknown) {
  return JSON.stringify(obj, null, 2)
}

async function call(method: 'GET' | 'POST', path: string, cookie: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      cookie: `${COOKIE_NAME}=${cookie}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let parsed: unknown = text
  try { parsed = JSON.parse(text) } catch {}
  return { status: res.status, body: parsed }
}

function banner(title: string) {
  console.log('\n' + '─'.repeat(72))
  console.log(' ' + title)
  console.log('─'.repeat(72))
}

async function main() {
  banner(`Setup: tìm user ${email}`)
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, isActive: true, isEmailVerified: true },
  })
  if (!user) {
    console.error('User not found')
    process.exit(1)
  }
  console.log(fmt(user))

  // Mint a next-auth-compatible JWT for this user.
  const token = await encode({
    token: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      permissions: [],
      sub: user.id,
    },
    secret: SECRET!,
  })

  banner('1. GET /api/tcoin/wallet')
  console.log(fmt(await call('GET', '/api/tcoin/wallet', token)))

  banner('2. GET /api/tcoin/overview')
  const overview = await call('GET', '/api/tcoin/overview', token)
  // overview is large — print balance + a summary instead of dumping it all.
  if (typeof overview.body === 'object' && overview.body !== null) {
    const o = overview.body as any
    console.log(fmt({
      status: overview.status,
      isAuthenticated: o?.data?.isAuthenticated,
      balance: o?.data?.balance,
      packages: Array.isArray(o?.data?.packages) ? `${o.data.packages.length} packages` : null,
      spendOptions: Array.isArray(o?.data?.spendOptions) ? `${o.data.spendOptions.length} options` : null,
      rewards: Array.isArray(o?.data?.rewards) ? `${o.data.rewards.length} rewards` : null,
      recentTransactions: Array.isArray(o?.data?.recentTransactions) ? `${o.data.recentTransactions.length} tx` : null,
      rewardStatus: o?.data?.rewardStatus,
      dailyCheckinAvailable: o?.data?.dailyCheckinAvailable,
    }))
  } else {
    console.log(fmt(overview))
  }

  banner('3. GET /api/tcoin/my-perks')
  console.log(fmt(await call('GET', '/api/tcoin/my-perks', token)))

  banner('4. GET /api/tcoin/transactions?page=1 (3 mới nhất)')
  const tx = await call('GET', '/api/tcoin/transactions?page=1', token)
  if (typeof tx.body === 'object' && tx.body !== null) {
    const t = tx.body as any
    // Service returns { transactions, total, page, perPage }
    const items = Array.isArray(t?.data?.transactions) ? t.data.transactions.slice(0, 3) : null
    console.log(fmt({ status: tx.status, total: t?.data?.total ?? null, sample: items }))
  } else {
    console.log(fmt(tx))
  }

  banner('5. POST /api/tcoin/reward/daily-checkin')
  console.log(fmt(await call('POST', '/api/tcoin/reward/daily-checkin', token)))

  banner('6. POST /api/tcoin/reward/verify-email (idempotent)')
  console.log(fmt(await call('POST', '/api/tcoin/reward/verify-email', token)))

  banner('7. POST /api/tcoin/spend { optionId: "room-theme" } — đổi perk Theme phòng (80 TCoin)')
  console.log(fmt(await call('POST', '/api/tcoin/spend', token, { optionId: 'room-theme' })))

  banner('8. GET /api/tcoin/wallet — số dư sau test')
  console.log(fmt(await call('GET', '/api/tcoin/wallet', token)))

  banner('9. GET /api/tcoin/my-perks — perks sau test')
  console.log(fmt(await call('GET', '/api/tcoin/my-perks', token)))

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
