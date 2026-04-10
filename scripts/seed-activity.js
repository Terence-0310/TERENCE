import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding activity (Favorites & Reviews)...')

  // Get first user (or create a dummy one)
  let user = await prisma.user.findFirst()
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Tuấn Khang',
        email: 'tuankhang@example.com',
        hashedPassword: 'dummy',
        role: 'USER',
        avatar: 'https://i.pravatar.cc/150?u=tuankhang'
      }
    })
  }

  // Get Top 5 Movies
  const movies = await prisma.movie.findMany({ take: 5, orderBy: { viewCount: 'desc' } })
  if (movies.length === 0) {
    console.log('No movies found to seed activity.')
    return
  }

  // Add Favorites
  const favoritesToCreate = [
    { movieId: movies[1]?.id },
    { movieId: movies[2]?.id },
    { movieId: movies[3]?.id },
    { movieId: movies[4]?.id },
  ].filter(f => f.movieId)

  for (const fav of favoritesToCreate) {
    try {
      await prisma.favorite.create({
        data: {
          userId: user.id,
          movieId: fav.movieId,
        }
      })
      console.log('Added favorite for movie', fav.movieId)
    } catch(e) {
      // ignore unique constraints
    }
  }

  // Add Reviews
  const reviewsToCreate = [
    {
      movieId: movies[0]?.id,
      rating: 5,
      content: 'Phim cực kỳ xuất sắc! Đồ họa của Ufotable chưa bao giờ làm mình thất vọng. Cảnh quay chiến đấu đỉnh cao, nhạc nền hào hùng. Cảm ơn TERENCE đã mang lại chất lượng 4K này!',
    },
    {
      movieId: movies[1]?.id,
      rating: 4,
      content: 'Cốt truyện khá mạch lạc, phần hành động tốt. Tuy nhiên cái kết hơi vội. Diễn viên chính diễn xuất rất nhập tâm. Sẽ xem lại phần 2 nếu có.',
    },
    {
      movieId: movies[2]?.id,
      rating: 5,
      content: 'Nhạc phim đỉnh cao, cốt truyện có chiều sâu. Không uổng công chờ đợi suốt 1 năm trời.',
    }
  ].filter(r => r.movieId)

  for (const rev of reviewsToCreate) {
    try {
      await prisma.review.create({
        data: {
          userId: user.id,
          movieId: rev.movieId,
          rating: rev.rating,
          content: rev.content,
          status: 'approved',
          isSpoiler: false,
        }
      })
      console.log('Added review for movie', rev.movieId)
    } catch(e) {
      // ignore
    }
  }

  console.log('Seeding Complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
