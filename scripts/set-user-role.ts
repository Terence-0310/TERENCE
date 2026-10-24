// Change an existing user's role.
// Usage: npm run user:role -- <email> [SUPER_ADMIN|ADMIN|STAFF|EDITOR|USER]   (default ADMIN)

import { Role } from '@prisma/client'
import { prisma } from '../src/be/shared/db/prisma'

async function main() {
  const [email, roleArg = 'ADMIN'] = process.argv.slice(2)
  const role = roleArg.toUpperCase() as Role
  if (!email || !Object.values(Role).includes(role)) {
    console.error(`Usage: npm run user:role -- <email> [${Object.values(Role).join('|')}]`)
    process.exit(1)
  }

  const user = await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { role },
    select: { id: true, email: true, name: true, role: true },
  }).catch(() => null)

  if (!user) {
    console.error(`Không tìm thấy user ${email}`)
    process.exit(1)
  }
  console.log('Đã cập nhật:', user)
}

main().finally(() => prisma.$disconnect())
