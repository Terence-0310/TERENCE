import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Bắt đầu rà soát và xóa data legacy...')

  try {
    // 1. Drop bảng Category và MovieCategory cũ nếu tồn tại
    // Do Prisma đã chuyển sang dùng Genre và MovieGenre
    console.log('➤ Đang kiểm tra và xóa bảng "Category", "MovieCategory" cũ...')
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "MovieCategory" CASCADE;`)
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Category" CASCADE;`)
    console.log('   ✅ Đã xóa bảng legacy Category thành công (nếu có).')

    // 2. Xóa các phim không có slug hoặc title (Data rác)
    console.log('➤ Đang xóa các phim lỗi (thiếu slug/title)...')
    const deletedMovies = await prisma.movie.deleteMany({
      where: {
        OR: [
          { slug: { equals: '' } },
          { title: { equals: '' } },
        ]
      }
    })
    console.log(`   ✅ Đã xóa ${deletedMovies.count} bộ phim rác.`)

    // 3. Xóa các WatchPartyRoom đã kết thúc nhưng còn lưu State rác
    console.log('➤ Đang dọn dẹp các phòng Watch Party đã ENDED...')
    const deletedRooms = await prisma.watchPartyRoom.deleteMany({
      where: {
        status: 'ENDED',
        updatedAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Xóa phòng ENDED quá 1 ngày
        }
      }
    })
    console.log(`   ✅ Đã xóa ${deletedRooms.count} phòng Watch Party cũ.`)

    // 4. Xóa các user không có email hợp lệ
    console.log('➤ Đang dọn dẹp User ảo/lỗi...')
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        email: {
          not: { contains: '@' }
        }
      }
    })
    console.log(`   ✅ Đã xóa ${deletedUsers.count} user có email không hợp lệ.`)

    console.log('🎉 Hoàn tất rà soát và dọn dẹp Database!')
  } catch (error) {
    console.error('❌ Có lỗi xảy ra trong quá trình sanitize DB:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
