const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const packages = [
    { name: 'Gói Cơ Bản', coinAmount: 100, bonusAmount: 0, priceVnd: 19000, isPopular: false },
    { name: 'Gói Sinh Viên', coinAmount: 500, bonusAmount: 50, priceVnd: 79000, isPopular: true },
    { name: 'Gói Mọt Phim', coinAmount: 1200, bonusAmount: 200, priceVnd: 169000, isPopular: false },
    { name: 'Gói VIP', coinAmount: 3000, bonusAmount: 600, priceVnd: 399000, isPopular: false }
  ];

  for (const pkg of packages) {
    await prisma.tCoinPackage.create({
      data: pkg
    });
  }
  console.log("Seeded TCoinPackages");
  await prisma.$disconnect();
}
run();
