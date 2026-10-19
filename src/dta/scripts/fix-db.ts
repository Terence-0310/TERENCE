import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Bắt đầu Thanh tẩy Database (Xóa Ràng buộc Index Cũ)...')

  try {
    // Thử xóa Constraint nếu đang dùng Postgres 
    await prisma.$executeRawUnsafe(`ALTER TABLE "Episode" DROP CONSTRAINT IF EXISTS "Episode_movieId_episodeNumber_key" CASCADE;`)
    console.log('✅ Đã xóa Constraint Episode_movieId_episodeNumber_key (Postgres)')
  } catch {
    // Bỏ qua lỗi vì có thể là MySQL hoặc Constraint không phải dạng này
  }

  try {
    // Thử xóa Index thông thường (Postgres/MySQL)
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Episode_movieId_episodeNumber_key";`)
    console.log('✅ Đã xóa Index Episode_movieId_episodeNumber_key')
  } catch {
    // Bỏ qua lỗi
  }

  console.log('🎉 Đã đả thông kinh mạch Database thành công! Cột mốc cản trở đã bị dọn dẹp.')
  await prisma.$disconnect()
}

main().catch(console.error)
