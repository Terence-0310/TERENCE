// ============================================
// Simulate SePay "money received" webhook (local demo)
// ============================================
// SePay cannot reach localhost, so this posts the exact payload SePay sends
// for an incoming transfer to /api/payments/sepay/webhook — the order is
// marked PAID, TCoin credited, the user gets the realtime toast + receipt.
//
// Usage: npm run demo:pay -- <ORDER_CODE>     (code shown on /tcoin, e.g. 8E2WLOQX)
//        npm run demo:pay                     (latest PENDING order)

import { prisma } from '../src/be/shared/db/prisma'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const secret = process.env.SEPAY_WEBHOOK_API_KEY || process.env.SEPAY_WEBHOOK_SECRET || ''

async function main() {
  const code = process.argv[2]?.replace(/^TCOIN_?/i, '').toUpperCase()
  const order = await prisma.topupOrder.findFirst({
    where: code ? { code } : { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  })
  if (!order) {
    console.error(code ? `Không tìm thấy đơn ${code}` : 'Không có đơn PENDING nào')
    process.exit(1)
  }

  const payload = {
    id: Date.now(),
    gateway: process.env.SEPAY_BANK_CODE || 'MBBank',
    transactionDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
    accountNumber: process.env.SEPAY_BANK_ACCOUNT || '0000000000',
    transferType: 'in',
    transferAmount: order.amountVnd,
    content: `TCOIN${order.code} chuyen tien`,
    referenceCode: `DEMO${Date.now()}`,
    description: 'Simulated transfer (demo)',
  }

  const res = await fetch(`${BASE}/api/payments/sepay/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(secret ? { Authorization: `Apikey ${secret}` } : {}) },
    body: JSON.stringify(payload),
  })
  console.log(`Đơn ${order.code} (${order.amountVnd.toLocaleString('vi-VN')}đ) → HTTP ${res.status}`, await res.text())
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
