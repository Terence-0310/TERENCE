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

  await prisma.user.upsert({
    where: { email: 'user@terence.vn' },
    update: { passwordHash: userHash, role: 'user', name: 'Người dùng Demo' },
    create: { email: 'user@terence.vn', name: 'Người dùng Demo', passwordHash: userHash, role: 'user', isActive: true },
  })

  await prisma.user.upsert({
    where: { email: 'staff@terence.vn' },
    update: { passwordHash: staffHash, role: 'staff', name: 'Staff Demo' },
    create: { email: 'staff@terence.vn', name: 'Staff Demo', passwordHash: staffHash, role: 'staff', isActive: true },
  })

  // ── Movies (expanded schema) ──
  const movieData = [
    { title: 'Tử Chiến Trên Không', slug: 'tu-chien-tren-khong', type: 'movie', status: 'published', genre: 'Hành động, Phiêu lưu', releaseYear: 2026, quality: 'FHD', viewCount: 12345, isFeatured: true, isPublished: true, sourceStatus: 'active', director: 'Nguyễn Quang Dũng', cast: 'Trấn Thành, Thu Trang', country: 'Việt Nam', language: 'vi', ageRating: 'C16', shortDescription: 'Cuộc chiến trên bầu trời' },
    { title: 'Hoa Máu', slug: 'hoa-mau', type: 'movie', status: 'published', genre: 'Hành động, Tâm lý', releaseYear: 2026, quality: 'HD', viewCount: 9876, isPublished: true, sourceStatus: 'active', director: 'Victor Vũ', country: 'Việt Nam', language: 'vi', ageRating: 'C18' },
    { title: 'Danh Dự Cuối Cùng', slug: 'danh-du-cuoi-cung', type: 'movie', status: 'published', genre: 'Tâm lý, Drama', releaseYear: 2025, quality: 'FHD', viewCount: 8765, isPublished: true, sourceStatus: 'active', country: 'Hàn Quốc', language: 'ko' },
    { title: 'Bàn Tay Diệt Quỷ', slug: 'ban-tay-diet-quy', type: 'movie', status: 'draft', genre: 'Kinh dị, Hành động', releaseYear: 2026, quality: 'HD', viewCount: 7654, sourceStatus: 'pending', country: 'Việt Nam', language: 'vi', ageRating: 'C18' },
    { title: 'Chòm Sao Thiên Hậu', slug: 'chom-sao-thien-hau', type: 'series', status: 'published', genre: 'Tâm lý, Tình cảm', releaseYear: 2026, quality: 'FHD', viewCount: 6543, isTrending: true, isPublished: true, sourceStatus: 'active', country: 'Trung Quốc', language: 'zh' },
    { title: 'Đừng Quên Anh Yêu Em', slug: 'dung-quen-anh-yeu-em', type: 'movie', status: 'published', genre: 'Lãng mạn, Tâm lý', releaseYear: 2025, quality: 'HD', viewCount: 5432, isPublished: true, sourceStatus: 'active', country: 'Việt Nam', language: 'vi' },
    { title: 'Bước Vào Tim Em', slug: 'buoc-vao-tim-em', type: 'series', status: 'hidden', genre: 'Tâm lý, Drama', releaseYear: 2025, quality: 'FHD', viewCount: 4321, sourceStatus: 'active', country: 'Hàn Quốc', language: 'ko' },
    { title: 'Tài Xế Ẩn Danh 3', slug: 'tai-xe-an-danh-3', type: 'movie', status: 'published', genre: 'Hành động, Hài hước', releaseYear: 2026, quality: '4K', viewCount: 3210, isRecommended: true, isPublished: true, sourceStatus: 'active', director: 'Lý Hải', country: 'Việt Nam', language: 'vi' },
    { title: 'Demon Slayer S5', slug: 'demon-slayer-s5', type: 'anime', status: 'published', genre: 'Anime, Hành động', releaseYear: 2026, quality: 'FHD', viewCount: 25000, isTrending: true, isFeatured: true, isPublished: true, sourceStatus: 'active', country: 'Nhật Bản', language: 'ja', ageRating: 'C13' },
    { title: 'Solo Leveling S2', slug: 'solo-leveling-s2', type: 'anime', status: 'draft', genre: 'Anime, Fantasy', releaseYear: 2026, quality: 'FHD', viewCount: 18000, sourceStatus: 'missing', country: 'Nhật Bản', language: 'ja' },
  ]

  for (const m of movieData) {
    await prisma.movie.upsert({
      where: { slug: m.slug },
      update: { viewCount: m.viewCount, status: m.status },
      create: { ...m, createdBy: admin.email, description: `Mô tả phim ${m.title}. Đây là một bộ phim hấp dẫn thuộc thể loại ${m.genre}.` },
    })
  }

  // ── Episodes for series/anime ──
  const seriesMovies = await prisma.movie.findMany({ where: { type: { in: ['series', 'anime'] } } })
  for (const s of seriesMovies) {
    const epCount = s.type === 'anime' ? 12 : 5
    for (let ep = 1; ep <= epCount; ep++) {
      const slug = `${s.slug}-tap-${ep}`
      const epId = `seed-${s.id}-${ep}`
      await prisma.episode.upsert({
        where: { id: epId },
        update: {},
        create: {
          id: epId, movieId: s.id, episodeNumber: ep, title: `Tập ${ep}`,
          slug, sourceType: 'mp4', sourceUrl: `https://example.com/video/${slug}.mp4`,
          sortOrder: ep, status: ep === epCount ? 'pending' : 'active',
          viewCount: Math.floor(Math.random() * 2000),
        },
      })
    }
  }

  // ── Shorts ──
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

  // ── Admin log ──
  await prisma.adminLog.create({
    data: { actorId: admin.id, action: 'login', metadata: JSON.stringify({ note: 'Seed initial login' }) },
  })

  console.log('✅ Seed complete!')
  console.log('   admin@terence.vn / Admin@12345 (super_admin)')
  console.log('   staff@terence.vn / Staff@12345 (staff)')
  console.log('   user@terence.vn  / User@12345  (user)')
  console.log(`   ${movieData.length} movies, ${shortData.length} shorts, episodes for series/anime`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
