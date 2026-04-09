const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const packages = [
    { slug: 'goi-co-ban', name: 'Gói Cơ Bản', coinAmount: 100, priceVnd: 19000, sortOrder: 1 },
    { slug: 'goi-sinh-vien', name: 'Gói Sinh Viên', coinAmount: 500, bonusAmount: 50, priceVnd: 79000, isPopular: true, sortOrder: 2 },
    { slug: 'goi-mot-phim', name: 'Gói Mọt Phim', coinAmount: 1200, bonusAmount: 200, priceVnd: 169000, sortOrder: 3 },
    { slug: 'goi-vip', name: 'Gói VIP', coinAmount: 3000, bonusAmount: 600, priceVnd: 399000, sortOrder: 4 },
  ];

  console.log('Seeding packages...');
  for (const pkg of packages) {
    await prisma.tCoinPackage.upsert({
      where: { slug: pkg.slug },
      update: pkg,
      create: pkg,
    });
  }
  console.log('Done!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
