import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const result = await prisma.user.updateMany({
    where: { email: 'demo@test.com' },
    data: { role: 'ADMIN' }
  })
  console.log('Updated:', result.count, 'users to ADMIN role')
  
  const user = await prisma.user.findFirst({ where: { email: 'demo@test.com' }, select: { id: true, email: true, name: true, role: true } })
  console.log('User:', user)
}

main().then(() => prisma.$disconnect())
