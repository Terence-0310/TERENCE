const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRaw`DELETE FROM "TopupOrder"`;
  await prisma.$executeRaw`DELETE FROM "TCoinPackage"`;
  console.log('Cleared');
}
main().catch(console.error).finally(() => prisma.$disconnect());
