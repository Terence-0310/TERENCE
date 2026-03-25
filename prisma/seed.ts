import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Users ──
  const adminHash = await bcrypt.hash('Admin@12345', 12)
  const userHash = await bcrypt.hash('User@12345', 12)
  const staffHash = await bcrypt.hash('Staff@12345', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@terence.vn' },
    update: { passwordHash: adminHash, role: 'super_admin', name: 'Admin Terence' },
    create: { email: 'admin@terence.vn', name: 'Admin Terence', passwordHash: adminHash, role: 'super_admin', isActive: true },
  })

  const demoUser = await prisma.user.upsert({
    where: { email: 'user@terence.vn' },
    update: { passwordHash: userHash, role: 'user', name: 'Người dùng Demo' },
    create: { email: 'user@terence.vn', name: 'Người dùng Demo', passwordHash: userHash, role: 'user', isActive: true },
  })

  await prisma.user.upsert({
    where: { email: 'staff@terence.vn' },
    update: { passwordHash: staffHash, role: 'staff', name: 'Staff Demo' },
    create: { email: 'staff@terence.vn', name: 'Staff Demo', passwordHash: staffHash, role: 'staff', isActive: true },
  })

  // ── Categories (Genres) ──
  console.log('   📂 Seeding categories...')
  const categoryData = [
    { name: 'Hành Động', slug: 'hanh-dong', tmdbId: 28 },
    { name: 'Phiêu Lưu', slug: 'phieu-luu', tmdbId: 12 },
    { name: 'Hoạt Hình', slug: 'hoat-hinh', tmdbId: 16 },
    { name: 'Hài', slug: 'hai', tmdbId: 35 },
    { name: 'Hình Sự', slug: 'hinh-su', tmdbId: 80 },
    { name: 'Tài Liệu', slug: 'tai-lieu', tmdbId: 99 },
    { name: 'Chính Kịch', slug: 'chinh-kich', tmdbId: 18 },
    { name: 'Gia Đình', slug: 'gia-dinh', tmdbId: 10751 },
    { name: 'Giả Tưởng', slug: 'gia-tuong', tmdbId: 14 },
    { name: 'Lịch Sử', slug: 'lich-su', tmdbId: 36 },
    { name: 'Kinh Dị', slug: 'kinh-di', tmdbId: 27 },
    { name: 'Âm Nhạc', slug: 'am-nhac', tmdbId: 10402 },
    { name: 'Bí Ẩn', slug: 'bi-an', tmdbId: 9648 },
    { name: 'Lãng Mạn', slug: 'lang-man', tmdbId: 10749 },
    { name: 'Khoa Học Viễn Tưởng', slug: 'khoa-hoc-vien-tuong', tmdbId: 878 },
    { name: 'Giật Gân', slug: 'giat-gan', tmdbId: 53 },
    { name: 'Chiến Tranh', slug: 'chien-tranh', tmdbId: 10752 },
    { name: 'Viễn Tây', slug: 'vien-tay', tmdbId: 37 },
    { name: 'Truyền Hình', slug: 'truyen-hinh', tmdbId: 10770 },
    { name: 'Tâm Lý', slug: 'tam-ly', tmdbId: null },
    { name: 'Tình Cảm', slug: 'tinh-cam', tmdbId: null },
  ]

  const categories: Record<string, string> = {}
  for (const cat of categoryData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, tmdbId: cat.tmdbId },
      create: { name: cat.name, slug: cat.slug, tmdbId: cat.tmdbId },
    })
    categories[cat.slug] = created.id
  }

  // ── Countries ──
  console.log('   🌍 Seeding countries...')
  const countryData = [
    { name: 'Mỹ', slug: 'my', code: 'US' },
    { name: 'Hàn Quốc', slug: 'han-quoc', code: 'KR' },
    { name: 'Nhật Bản', slug: 'nhat-ban', code: 'JP' },
    { name: 'Trung Quốc', slug: 'trung-quoc', code: 'CN' },
    { name: 'Thái Lan', slug: 'thai-lan', code: 'TH' },
    { name: 'Ấn Độ', slug: 'an-do', code: 'IN' },
    { name: 'Anh', slug: 'anh', code: 'GB' },
    { name: 'Pháp', slug: 'phap', code: 'FR' },
    { name: 'Đức', slug: 'duc', code: 'DE' },
    { name: 'Ý', slug: 'y', code: 'IT' },
    { name: 'Tây Ban Nha', slug: 'tay-ban-nha', code: 'ES' },
    { name: 'Việt Nam', slug: 'viet-nam', code: 'VN' },
    { name: 'Hồng Kông', slug: 'hong-kong', code: 'HK' },
    { name: 'Đài Loan', slug: 'dai-loan', code: 'TW' },
    { name: 'Nga', slug: 'nga', code: 'RU' },
    { name: 'Brazil', slug: 'brazil', code: 'BR' },
    { name: 'Mexico', slug: 'mexico', code: 'MX' },
    { name: 'Úc', slug: 'uc', code: 'AU' },
    { name: 'Canada', slug: 'canada', code: 'CA' },
    { name: 'Thụy Điển', slug: 'thuy-dien', code: 'SE' },
  ]

  const countryMap: Record<string, string> = {}
  for (const c of countryData) {
    const created = await prisma.country.upsert({
      where: { slug: c.slug },
      update: { name: c.name, code: c.code },
      create: { name: c.name, slug: c.slug, code: c.code },
    })
    countryMap[c.slug] = created.id
  }

  // ── People (sample actors/directors) ──
  console.log('   👤 Seeding people...')
  const peopleData = [
    { name: 'Trấn Thành', slug: 'tran-thanh', knownFor: 'Acting' },
    { name: 'Thu Trang', slug: 'thu-trang', knownFor: 'Acting' },
    { name: 'Nguyễn Quang Dũng', slug: 'nguyen-quang-dung', knownFor: 'Directing' },
    { name: 'Victor Vũ', slug: 'victor-vu', knownFor: 'Directing' },
    { name: 'Lý Hải', slug: 'ly-hai', knownFor: 'Directing' },
    { name: 'Ninh Dương Lan Ngọc', slug: 'ninh-duong-lan-ngoc', knownFor: 'Acting' },
  ]

  const peopleMap: Record<string, string> = {}
  for (const p of peopleData) {
    const created = await prisma.person.upsert({
      where: { slug: p.slug },
      update: { name: p.name, knownFor: p.knownFor },
      create: { name: p.name, slug: p.slug, knownFor: p.knownFor },
    })
    peopleMap[p.slug] = created.id
  }

  // ── Movies (expanded schema) ──
  console.log('   🎬 Seeding movies...')
  const movieData = [
    {
      title: 'Tử Chiến Trên Không', slug: 'tu-chien-tren-khong', contentType: 'movie', status: 'published',
      categoryText: 'Hành Động, Phiêu Lưu', year: 2026, quality: 'FHD', viewCount: 12345,
      isFeatured: true, isPublished: true, isActive: true, sourceStatus: 'active',
      directorText: 'Nguyễn Quang Dũng', actorText: 'Trấn Thành, Thu Trang',
      countryText: 'Việt Nam', language: 'vi', ageRating: 'C16',
      shortDescription: 'Cuộc chiến trên bầu trời',
      categorySlugs: ['hanh-dong', 'phieu-luu'],
      countrySlugs: ['viet-nam'],
      peopleSlugs: [
        { slug: 'nguyen-quang-dung', role: 'director' },
        { slug: 'tran-thanh', role: 'actor', character: 'Trung úy Minh' },
        { slug: 'thu-trang', role: 'actor', character: 'Đại tá Hương' },
      ],
    },
    {
      title: 'Hoa Máu', slug: 'hoa-mau', contentType: 'movie', status: 'published',
      categoryText: 'Hành Động, Tâm Lý', year: 2026, quality: 'HD', viewCount: 9876,
      isPublished: true, isActive: true, sourceStatus: 'active',
      directorText: 'Victor Vũ', countryText: 'Việt Nam', language: 'vi', ageRating: 'C18',
      categorySlugs: ['hanh-dong', 'tam-ly'],
      countrySlugs: ['viet-nam'],
      peopleSlugs: [{ slug: 'victor-vu', role: 'director' }],
    },
    {
      title: 'Danh Dự Cuối Cùng', slug: 'danh-du-cuoi-cung', contentType: 'movie', status: 'published',
      categoryText: 'Tâm Lý, Chính Kịch', year: 2025, quality: 'FHD', viewCount: 8765,
      isPublished: true, isActive: true, sourceStatus: 'active',
      countryText: 'Hàn Quốc', language: 'ko',
      categorySlugs: ['tam-ly', 'chinh-kich'],
      countrySlugs: ['han-quoc'],
      peopleSlugs: [],
    },
    {
      title: 'Bàn Tay Diệt Quỷ', slug: 'ban-tay-diet-quy', contentType: 'movie', status: 'draft',
      categoryText: 'Kinh Dị, Hành Động', year: 2026, quality: 'HD', viewCount: 7654,
      isActive: true, sourceStatus: 'pending',
      countryText: 'Việt Nam', language: 'vi', ageRating: 'C18',
      categorySlugs: ['kinh-di', 'hanh-dong'],
      countrySlugs: ['viet-nam'],
      peopleSlugs: [],
    },
    {
      title: 'Chòm Sao Thiên Hậu', slug: 'chom-sao-thien-hau', contentType: 'series', status: 'published',
      categoryText: 'Tâm Lý, Tình Cảm', year: 2026, quality: 'FHD', viewCount: 6543,
      isTrending: true, isPublished: true, isActive: true, sourceStatus: 'active',
      countryText: 'Trung Quốc', language: 'zh',
      categorySlugs: ['tam-ly', 'tinh-cam'],
      countrySlugs: ['trung-quoc'],
      peopleSlugs: [],
    },
    {
      title: 'Đừng Quên Anh Yêu Em', slug: 'dung-quen-anh-yeu-em', contentType: 'movie', status: 'published',
      categoryText: 'Lãng Mạn, Tâm Lý', year: 2025, quality: 'HD', viewCount: 5432,
      isPublished: true, isActive: true, sourceStatus: 'active',
      countryText: 'Việt Nam', language: 'vi',
      categorySlugs: ['lang-man', 'tam-ly'],
      countrySlugs: ['viet-nam'],
      peopleSlugs: [],
    },
    {
      title: 'Bước Vào Tim Em', slug: 'buoc-vao-tim-em', contentType: 'series', status: 'hidden',
      categoryText: 'Tâm Lý, Chính Kịch', year: 2025, quality: 'FHD', viewCount: 4321,
      isActive: true, sourceStatus: 'active',
      countryText: 'Hàn Quốc', language: 'ko',
      categorySlugs: ['tam-ly', 'chinh-kich'],
      countrySlugs: ['han-quoc'],
      peopleSlugs: [],
    },
    {
      title: 'Tài Xế Ẩn Danh 3', slug: 'tai-xe-an-danh-3', contentType: 'movie', status: 'published',
      categoryText: 'Hành Động, Hài', year: 2026, quality: '4K', viewCount: 3210,
      isRecommended: true, isPublished: true, isActive: true, sourceStatus: 'active',
      directorText: 'Lý Hải', countryText: 'Việt Nam', language: 'vi',
      categorySlugs: ['hanh-dong', 'hai'],
      countrySlugs: ['viet-nam'],
      peopleSlugs: [{ slug: 'ly-hai', role: 'director' }],
    },
    {
      title: 'Demon Slayer S5', slug: 'demon-slayer-s5', contentType: 'anime', status: 'published',
      categoryText: 'Hoạt Hình, Hành Động', year: 2026, quality: 'FHD', viewCount: 25000,
      isTrending: true, isFeatured: true, isPublished: true, isActive: true, sourceStatus: 'active',
      countryText: 'Nhật Bản', language: 'ja', ageRating: 'C13',
      categorySlugs: ['hoat-hinh', 'hanh-dong'],
      countrySlugs: ['nhat-ban'],
      peopleSlugs: [],
    },
    {
      title: 'Solo Leveling S2', slug: 'solo-leveling-s2', contentType: 'anime', status: 'draft',
      categoryText: 'Hoạt Hình, Giả Tưởng', year: 2026, quality: 'FHD', viewCount: 18000,
      isActive: true, sourceStatus: 'missing',
      countryText: 'Nhật Bản', language: 'ja',
      categorySlugs: ['hoat-hinh', 'gia-tuong'],
      countrySlugs: ['nhat-ban'],
      peopleSlugs: [],
    },
  ]

  for (const m of movieData) {
    const { categorySlugs, countrySlugs, peopleSlugs, ...movieFields } = m
    const movie = await prisma.movie.upsert({
      where: { slug: m.slug },
      update: { viewCount: m.viewCount, status: m.status },
      create: {
        ...movieFields,
        createdBy: admin.email,
        description: `Mô tả phim ${m.title}. Đây là một bộ phim hấp dẫn thuộc thể loại ${m.categoryText}.`,
      },
    })

    // Link categories
    for (const catSlug of categorySlugs) {
      if (categories[catSlug]) {
        await prisma.movieCategory.upsert({
          where: {
            movieId_categoryId: { movieId: movie.id, categoryId: categories[catSlug] },
          },
          update: {},
          create: { movieId: movie.id, categoryId: categories[catSlug] },
        })
      }
    }

    // Link countries
    for (const cSlug of countrySlugs) {
      if (countryMap[cSlug]) {
        await prisma.movieCountry.upsert({
          where: {
            movieId_countryId: { movieId: movie.id, countryId: countryMap[cSlug] },
          },
          update: {},
          create: { movieId: movie.id, countryId: countryMap[cSlug] },
        })
      }
    }

    // Link people
    for (const p of peopleSlugs) {
      if (peopleMap[p.slug]) {
        await prisma.moviePerson.upsert({
          where: {
            movieId_personId_role: {
              movieId: movie.id,
              personId: peopleMap[p.slug],
              role: p.role,
            },
          },
          update: {},
          create: {
            movieId: movie.id,
            personId: peopleMap[p.slug],
            role: p.role,
            character: (p as any).character || null,
          },
        })
      }
    }
  }

  // ── Episodes for series/anime ──
  console.log('   📺 Seeding episodes...')
  const seriesMovies = await prisma.movie.findMany({ where: { contentType: { in: ['series', 'anime'] } } })
  for (const s of seriesMovies) {
    const epCount = s.contentType === 'anime' ? 12 : 5
    for (let ep = 1; ep <= epCount; ep++) {
      const epSlug = `${s.slug}-tap-${ep}`
      const epId = `seed-${s.id}-${ep}`
      await prisma.episode.upsert({
        where: { id: epId },
        update: {},
        create: {
          id: epId,
          movieId: s.id,
          episodeNumber: ep,
          episodeOrder: ep,
          episodeName: `Tập ${ep}`,
          episodeSlug: `tap-${ep}`,
          title: `Tập ${ep}`,
          slug: epSlug,
          sourceName: 'Manual',
          serverName: 'Server #1',
          streamType: 'mp4',
          streamUrl: `https://example.com/video/${epSlug}.mp4`,
          sourceUrl: `https://example.com/video/${epSlug}.mp4`,
          sortOrder: ep,
          status: ep === epCount ? 'pending' : 'active',
          isActive: ep !== epCount,
          viewCount: Math.floor(Math.random() * 2000),
        },
      })
    }
    // Update movie episodeCurrent / episodeTotal
    await prisma.movie.update({
      where: { id: s.id },
      data: {
        episodeCurrent: `${epCount}/${epCount}`,
        episodeTotal: epCount,
      },
    })
  }

  // ── Shorts ──
  console.log('   🎞️ Seeding shorts...')
  const shortData = [
    { title: 'Behind the scenes: Tử Chiến', slug: 'bts-tu-chien', hashtags: '#bts,#hanh_dong', status: 'active', viewCount: 5000, likeCount: 320 },
    { title: 'Phản ứng khán giả Hoa Máu', slug: 'reaction-hoa-mau', hashtags: '#reaction,#hoa_mau', status: 'active', viewCount: 3200, likeCount: 180 },
    { title: 'Teaser: Chòm Sao Thiên Hậu', slug: 'teaser-chom-sao', hashtags: '#teaser,#comingsoon', status: 'draft', viewCount: 800, likeCount: 50 },
  ]
  for (const sh of shortData) {
    await prisma.short.upsert({
      where: { slug: sh.slug },
      update: { viewCount: sh.viewCount },
      create: { ...sh, createdBy: admin.email, description: `Short: ${sh.title}` },
    })
  }

  // ── Movie Sources (sample) ──
  console.log('   🔗 Seeding movie sources...')
  const sampleMovies = await prisma.movie.findMany({ take: 3 })
  for (const movie of sampleMovies) {
    await prisma.movieSource.upsert({
      where: { id: `src-manual-${movie.id}` },
      update: {},
      create: {
        id: `src-manual-${movie.id}`,
        movieId: movie.id,
        sourceName: 'Manual',
        quality: movie.quality || 'HD',
        language: 'vietsub',
        priority: 1,
        isActive: true,
      },
    })
  }

  // ── Sample Watch History ──
  console.log('   👁️ Seeding watch history...')
  const firstMovie = await prisma.movie.findFirst({ where: { isPublished: true } })
  if (firstMovie) {
    const existingWatch = await prisma.watchHistory.findFirst({
      where: { userId: demoUser.id, movieId: firstMovie.id, episodeId: null },
    })
    if (existingWatch) {
      await prisma.watchHistory.update({
        where: { id: existingWatch.id },
        data: { progress: 45.5, lastWatchedAt: new Date() },
      })
    } else {
      await prisma.watchHistory.create({
        data: {
          userId: demoUser.id,
          movieId: firstMovie.id,
          progress: 45.5,
          currentTime: 2730,
          duration: 6000,
          deviceType: 'desktop',
        },
      })
    }
  }

  // ── Admin log ──
  await prisma.adminLog.create({
    data: { actorId: admin.id, action: 'login', metadata: JSON.stringify({ note: 'Seed initial login' }) },
  })

  console.log('✅ Seed complete!')
  console.log('   admin@terence.vn / Admin@12345 (super_admin)')
  console.log('   staff@terence.vn / Staff@12345 (staff)')
  console.log('   user@terence.vn  / User@12345  (user)')
  console.log(`   ${movieData.length} movies, ${shortData.length} shorts, episodes for series/anime`)
  console.log(`   ${categoryData.length} categories, ${countryData.length} countries, ${peopleData.length} people`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
