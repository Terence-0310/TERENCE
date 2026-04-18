import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Arrays for authentic Vietnamese names
const hoList = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý']
const demList = ['Văn', 'Thị', 'Thanh', 'Minh', 'Ngọc', 'Hữu', 'Đức', 'Xuân', 'Thu', 'Hoài', 'Thành', 'Tuấn', 'Tấn', 'Hải', 'Bảo', 'Gia']
const tenList = ['Anh', 'Tuấn', 'Hùng', 'Dũng', 'Quang', 'Minh', 'Thắng', 'Long', 'Linh', 'Trang', 'Hà', 'Phương', 'Lan', 'Hoa', 'Mai', 'Khoa', 'Khánh', 'Sơn', 'Tài', 'Phát', 'Đạt']

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateVietnameseName() {
  const ho = randomElement(hoList)
  const dem = randomElement(demList)
  const ten = randomElement(tenList)
  return `${ho} ${dem} ${ten}`
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function generateRandomAvatar(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
}

async function main() {
  const TARGET_USERS = 10123
  console.log(`Starting to seed ${TARGET_USERS} authentic users...`)

  // Check if we already have the Target TCoinPackage
  let pkgs = await prisma.tCoinPackage.findMany()
  if (pkgs.length === 0) {
    console.log('No TCoinPackage found, creating basic packages...')
    await prisma.tCoinPackage.createMany({
      data: [
        { id: crypto.randomUUID(), slug: 'pkg-1', name: 'Gói Cơ Bản (50 T-Coin)', coinAmount: 50, bonusAmount: 0, priceVnd: 50000, isActive: true },
        { id: crypto.randomUUID(), slug: 'pkg-2', name: 'Gói Chuẩn (100 T-Coin)', coinAmount: 100, bonusAmount: 10, priceVnd: 100000, isActive: true },
        { id: crypto.randomUUID(), slug: 'pkg-3', name: 'Gói VIP (500 T-Coin)', coinAmount: 500, bonusAmount: 100, priceVnd: 500000, isPopular: true, isActive: true }
      ]
    })
    pkgs = await prisma.tCoinPackage.findMany()
  }

  const BATCH_SIZE = 500
  let usersCreated = 0

  while (usersCreated < TARGET_USERS) {
    const batchSize = Math.min(BATCH_SIZE, TARGET_USERS - usersCreated)
    
    const usersBatch = []
    const walletsBatch = []
    const transactionsBatch = []
    const topupOrdersBatch = []
    const adminLogsBatch = []

    for (let i = 0; i < batchSize; i++) {
        const userId = crypto.randomUUID()
        const name = generateVietnameseName()
        const normalizedName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/\s/g, '').toLowerCase()
        const email = `${normalizedName}_${Date.now()}_${i}@gmail.com`
        const isBanned = Math.random() < 0.05
        
        const loginDaysAgo = Math.floor(Math.random() * 60)
        const createdAt = randomDate(new Date(2025, 0, 1), new Date())
        const lastLoginAt = new Date(new Date().getTime() - loginDaysAgo * 24 * 60 * 60 * 1000)

        usersBatch.push({
          id: userId,
          name,
          email,
          role: 'USER',
          status: isBanned ? 'banned' : 'active',
          isActive: !isBanned,
          blockedReason: isBanned ? 'Vi phạm điều khoản cộng đồng' : null,
          avatar: Math.random() > 0.5 ? generateRandomAvatar(name) : null,
          isEmailVerified: true,
          emailVerified: createdAt,
          createdAt,
          lastLoginAt,
          loginCount: Math.floor(Math.random() * 50) + 1,
        })

        // Give ~30% of users a wallet with transactions
        if (Math.random() < 0.3) {
            const walletId = crypto.randomUUID()
            const totalCoins = Math.floor(Math.random() * 1000) + 50
            walletsBatch.push({
                id: walletId,
                userId,
                balance: totalCoins,
                createdAt,
                updatedAt: new Date()
            })

            // Generate some Topup Orders
            const pkg = randomElement(pkgs)
            const orderId = crypto.randomUUID()
            const orderCode = `TC${Math.floor(Math.random() * 1000000)}`
            topupOrdersBatch.push({
                id: orderId,
                code: orderCode,
                userId,
                packageId: pkg.id,
                provider: 'BANK_QR',
                amountVnd: pkg.priceVnd,
                coinAmount: pkg.coinAmount,
                bonusAmount: pkg.bonusAmount,
                transferContent: orderCode,
                status: 'PAID',
                paidAt: randomDate(createdAt, new Date()),
                createdAt: randomDate(createdAt, new Date())
            })

            // Generate Wallet Transaction for the topup
            transactionsBatch.push({
                id: crypto.randomUUID(),
                walletId,
                userId,
                type: 'TOPUP',
                direction: 'CREDIT',
                amount: pkg.coinAmount + pkg.bonusAmount,
                balanceBefore: 0,
                balanceAfter: pkg.coinAmount + pkg.bonusAmount,
                status: 'SUCCESS',
                title: 'Nạp T-Coin',
                description: `Nạp thành công ${pkg.coinAmount + pkg.bonusAmount} T-Coin từ ngân hàng`,
                createdAt: randomDate(createdAt, new Date())
            })
        }
    }

    await prisma.$transaction(async (tx) => {
        // @ts-ignore
        await tx.user.createMany({ data: usersBatch, skipDuplicates: true })
        
        if (walletsBatch.length > 0) {
            // @ts-ignore
            await tx.wallet.createMany({ data: walletsBatch, skipDuplicates: true })
        }
        if (transactionsBatch.length > 0) {
            // @ts-ignore
            await tx.walletTransaction.createMany({ data: transactionsBatch, skipDuplicates: true })
        }
        if (topupOrdersBatch.length > 0) {
            // @ts-ignore
            await tx.topupOrder.createMany({ data: topupOrdersBatch, skipDuplicates: true })
        }
    })

    usersCreated += batchSize
    const percent = Math.round((usersCreated / TARGET_USERS) * 100)
    console.log(`[${percent}%] Inserted batch: ${usersCreated}/${TARGET_USERS} users...`)
  }

  // Insert Admin Logs randomly
  console.log('Generating realistic Admin Logs...')
  const admins = await prisma.user.findMany({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } }, take: 5 })
  if (admins.length > 0) {
    const adminLogs = []
    for (let i = 0; i < 50; i++) {
        const admin = randomElement(admins)
        adminLogs.push({
            id: crypto.randomUUID(),
            actorId: admin.id,
            action: randomElement(['UPDATE_USER_ROLE', 'BLOCK_USER', 'DELETE_MOVIE', 'CLEAR_CACHE', 'UPDATE_SETTINGS']),
            resource: randomElement(['User', 'Movie', 'System']),
            resourceId: crypto.randomUUID(),
            ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
            createdAt: randomDate(new Date(2025, 0, 1), new Date()),
        })
    }
    // @ts-ignore
    await prisma.adminLog.createMany({ data: adminLogs, skipDuplicates: true })
  }

  console.log('✅ Seeding completed! Your system is now populated with real-world scaled data.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
