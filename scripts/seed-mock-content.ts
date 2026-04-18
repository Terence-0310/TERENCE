import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

const GENRES = [
  'Hành Động', 'Phiêu Lưu', 'Hoạt Hình', 'Hài Hước', 'Hình Sự',
  'Tài Liệu', 'Chính Kịch', 'Gia Đình', 'Viễn Tưởng', 'Lịch Sử',
  'Kinh Dị', 'Nhạc Kịch', 'Bí Ẩn', 'Tình Cảm', 'Khoa Học',
  'Giật Gân', 'Chiến Tranh', 'Miền Tây', 'Thần Thoại', 'Tâm Lý'
]

const COUNTRIES = [
  { name: 'Âu Mỹ', code: 'US' },
  { name: 'Hàn Quốc', code: 'KR' },
  { name: 'Trung Quốc', code: 'CN' },
  { name: 'Nhật Bản', code: 'JP' },
  { name: 'Việt Nam', code: 'VN' },
  { name: 'Thái Lan', code: 'TH' },
  { name: 'Ấn Độ', code: 'IN' },
  { name: 'Pháp', code: 'FR' },
  { name: 'Anh', code: 'UK' },
  { name: 'Đài Loan', code: 'TW' },
]

function toSlug(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function main() {
  console.log('Seeding Genres and Countries...')
  
  // 1. Seed Genres
  const genreCache = []
  for (const g of GENRES) {
    const slug = toSlug(g)
    const genre = await prisma.genre.upsert({
      where: { slug },
      update: {},
      create: { id: crypto.randomUUID(), name: g, slug, isActive: true },
    })
    genreCache.push(genre)
  }
  console.log(`✅ Seeded ${genreCache.length} genres`)

  // 2. Seed Countries
  const countryCache = []
  for (const c of COUNTRIES) {
    const slug = toSlug(c.name)
    const country = await prisma.country.upsert({
      where: { slug },
      update: {},
      create: { id: crypto.randomUUID(), name: c.name, slug, code: c.code, isActive: true },
    })
    countryCache.push(country)
  }
  console.log(`✅ Seeded ${countryCache.length} countries`)

  // 3. Seed Movies
  const TARGET_MOVIES = 2854
  console.log(`Starting to seed ${TARGET_MOVIES} mock movies...`)

  const BATCH_SIZE = 500
  let moviesCreated = 0

  while (moviesCreated < TARGET_MOVIES) {
    const batchSize = Math.min(BATCH_SIZE, TARGET_MOVIES - moviesCreated)
    
    const moviesBatch: any[] = []
    const movieGenresBatch: any[] = []
    const movieCountriesBatch: any[] = []

    for (let i = 0; i < batchSize; i++) {
        const movieId = crypto.randomUUID()
        const title = `Phim Điện Ảnh Mock ${moviesCreated + i + 1}`
        const originalTitle = `Movie Mock Series ${moviesCreated + i + 1}`
        const slug = toSlug(title) + '-' + crypto.randomBytes(3).toString('hex')
        const contentType = Math.random() > 0.3 ? 'movie' : 'series'

        const createdAt = randomDate(new Date(2023, 0, 1), new Date())

        moviesBatch.push({
          id: movieId,
          title,
          originalTitle,
          slug,
          contentType,
          status: 'published',
          year: 2015 + Math.floor(Math.random() * 11),
          rating: Number((Math.random() * 5 + 5).toFixed(1)), // 5.0 to 10.0
          viewCount: Math.floor(Math.random() * 500000),
          isPublished: true,
          isActive: true,
          isFeatured: Math.random() > 0.95,
          createdAt,
          publishedAt: createdAt,
          updatedAt: new Date()
        })

        // Assign 2-3 random genres
        const shuffledGenres = [...genreCache].sort(() => 0.5 - Math.random())
        const selectedGenres = shuffledGenres.slice(0, Math.floor(Math.random() * 2) + 2)
        for (const g of selectedGenres) {
            movieGenresBatch.push({
                id: crypto.randomUUID(),
                movieId,
                genreId: g.id,
                createdAt: new Date()
            })
        }

        // Assign 1 random country
        const selectedCountry = randomElement(countryCache)
        movieCountriesBatch.push({
            id: crypto.randomUUID(),
            movieId,
            countryId: selectedCountry.id,
            createdAt: new Date()
        })
    }

    await prisma.$transaction(async (tx) => {
        // @ts-ignore
        await tx.movie.createMany({ data: moviesBatch, skipDuplicates: true })
        // @ts-ignore
        await tx.movieGenre.createMany({ data: movieGenresBatch, skipDuplicates: true })
        // @ts-ignore
        await tx.movieCountry.createMany({ data: movieCountriesBatch, skipDuplicates: true })
    })

    moviesCreated += batchSize
    const percent = Math.round((moviesCreated / TARGET_MOVIES) * 100)
    console.log(`[${percent}%] Inserted batch: ${moviesCreated}/${TARGET_MOVIES} movies...`)
  }

  console.log('✅ Content Seeding completed! Genres, Countries, and Movies are ready.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
