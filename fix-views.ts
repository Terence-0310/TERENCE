import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetViews() {
  console.log('Resetting view counts for broken movies...')
  
  // 1. Reset broken ones
  await prisma.movie.updateMany({
    where: {
      title: {
        in: ['Demon Slayer S5', 'Họa Miêu', 'Luật Sư Bóng Ma', 'Tài Xế Ẩn Danh 3', 'Rừng Thép']
      }
    },
    data: {
      viewCount: 0
    }
  })
  
  // Or just reset all without tmdbId to 0 views
  await prisma.movie.updateMany({
    where: {
      tmdbId: null
    },
    data: {
      viewCount: 0
    }
  })

  // 2. Fetch movies with valid tmdbId
  const validMovies = await prisma.movie.findMany({
    where: {
      tmdbId: { not: null },
      title: {
        notIn: ['Tử Chiến Trên Không', 'Danh Dự Cuối Cùng', 'Nhân Quả']
      }
    },
    take: 10
  })
  
  // 3. Give them high views
  for (let i = 0; i < validMovies.length; i++) {
    const movie = validMovies[i]
    let viewValue = (20000 - i * 1500)
    
    await prisma.movie.update({
      where: { id: movie.id },
      data: { viewCount: viewValue }
    })
    console.log(`Updated ${movie.title} to ${viewValue} views`)
  }
}

resetViews()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
