const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.$disconnect();
}
run();
