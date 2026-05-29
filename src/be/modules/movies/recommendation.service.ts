// ============================================
// Movie Recommendation Service (AI/Heuristic)
// ============================================

import { prisma } from '@/src/be/shared/db/prisma'
import { getCache, setCache } from '@/src/lib/cache'
import { CARD_SELECT, PUBLISHED_FILTER } from './movie-service'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'recommendation-service' })

/**
 * Lấy danh sách gợi ý phim thông minh (AI Recommendation - Content Based Filtering).
 * Phân tích lịch sử xem của user để trích xuất các thể loại yêu thích nhất,
 * từ đó truy vấn các phim chưa xem thuộc các thể loại này.
 */
export async function getRecommendationsForUser(userId: string, limit: number = 12) {
  const cacheKey = `movies:recommendations:${userId}`
  const cached = await getCache<any>(cacheKey)
  if (cached) return cached

  // 1. Lấy lịch sử xem gần đây (tối đa 50 phim)
  const history = await prisma.watchHistory.findMany({
    where: { userId },
    select: { movieId: true },
    orderBy: { lastWatchedAt: 'desc' },
    take: 50,
  })

  // Nếu chưa có lịch sử (guest hoặc new user), fallback về trending
  if (history.length === 0) {
    const trending = await prisma.movie.findMany({
      where: PUBLISHED_FILTER,
      select: CARD_SELECT,
      orderBy: { viewCount: 'desc' },
      take: limit,
    })
    await setCache(cacheKey, trending, 3600) // cache 1 hour
    return trending
  }

  const watchedMovieIds = history.map(h => h.movieId)

  // 2. Lấy chi tiết các phim đã xem để phân tích sở thích (thể loại, quốc gia, tags)
  const watchedMovies = await prisma.movie.findMany({
    where: { id: { in: watchedMovieIds } },
    select: {
      genres: { select: { genreId: true } },
      countries: { select: { countryId: true } },
      tags: true,
    }
  })

  // 3. Đếm tần suất (Xây dựng user profile đa chiều)
  const genreFreq = new Map<string, number>()
  const countryFreq = new Map<string, number>()
  const tagFreq = new Map<string, number>()

  for (const m of watchedMovies) {
    for (const g of m.genres) {
      genreFreq.set(g.genreId, (genreFreq.get(g.genreId) || 0) + 1)
    }
    for (const c of m.countries) {
      countryFreq.set(c.countryId, (countryFreq.get(c.countryId) || 0) + 1)
    }
    if (m.tags) {
      const tags = m.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      for (const t of tags) {
        tagFreq.set(t, (tagFreq.get(t) || 0) + 1)
      }
    }
  }

  // Lấy các Top đặc trưng
  const topGenres = Array.from(genreFreq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0])
  const topCountries = Array.from(countryFreq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0])
  const topTags = Array.from(tagFreq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0])

  if (topGenres.length === 0 && topCountries.length === 0) {
    const trending = await prisma.movie.findMany({
      where: PUBLISHED_FILTER,
      select: CARD_SELECT,
      orderBy: { viewCount: 'desc' },
      take: limit,
    })
    return trending
  }

  // --- ELASTICSEARCH INTEGRATION (MORE LIKE THIS) ---
  let finalRecommendations: any[] = []
  
  try {
    const { getClient, getMoviesIndex, isAvailable } = await import('@/src/be/modules/search/elastic-client')
    const esOk = await isAvailable()
    
    if (esOk) {
      const client = getClient()
      const esResult = await client.search({
        index: getMoviesIndex(),
        size: limit * 2, // Lấy dư để query Prisma
        query: {
          bool: {
            must: [
              { term: { isActive: true } },
              {
                more_like_this: {
                  fields: ['categories', 'countries', 'actors', 'directors', 'title'],
                  like: watchedMovieIds.slice(0, 10).map(id => ({ _index: getMoviesIndex(), _id: id })),
                  min_term_freq: 1,
                  max_query_terms: 25,
                  min_doc_freq: 1,
                }
              }
            ],
            must_not: [
              { ids: { values: watchedMovieIds } }
            ]
          }
        }
      })

      const esIds = (esResult.hits.hits || []).map((h: any) => h._id as string)
      if (esIds.length > 0) {
        // Fetch dữ liệu chuẩn CARD_SELECT từ Prisma
        const esMovies = await prisma.movie.findMany({
          where: { ...PUBLISHED_FILTER, id: { in: esIds } },
          select: CARD_SELECT
        })
        
        // Sắp xếp lại đúng thứ tự điểm ES trả về
        const esMap = new Map(esMovies.map(m => [m.id, m]))
        finalRecommendations = esIds.map(id => esMap.get(id)).filter(Boolean).slice(0, limit)
      }
    }
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'Elasticsearch MLT fallback to Prisma due to error')
  }

  // --- FALLBACK PRISMA (CONTENT-BASED SCORING) ---
  if (finalRecommendations.length === 0) {
    // 4. Query tập ứng viên (candidates) rộng hơn (100 phim) chứa ít nhất 1 đặc trưng
    const orConditions: any[] = []
    if (topGenres.length > 0) {
      orConditions.push({ genres: { some: { genreId: { in: topGenres } } } })
    }
    if (topCountries.length > 0) {
      orConditions.push({ countries: { some: { countryId: { in: topCountries } } } })
    }

    const candidates = await prisma.movie.findMany({
      where: {
        ...PUBLISHED_FILTER,
        id: { notIn: watchedMovieIds }, // Loại trừ phim đã xem
        OR: orConditions.length > 0 ? orConditions : undefined
      },
      // Include thêm tags để dùng cho scoring thuật toán
      select: { ...CARD_SELECT, tags: true },
      take: 100,
    })

    // 5. Tính điểm (Scoring Algorithm) cho từng ứng viên
    const scoredCandidates = candidates.map(movie => {
      let score = 0
      
      // Thể loại: +3 điểm cho mỗi thể loại trùng khớp
      movie.genres.forEach((g: any) => {
        if (topGenres.includes(g.genreId)) score += 3
      })
      
      // Quốc gia: +2 điểm cho mỗi quốc gia trùng khớp
      movie.countries.forEach((c: any) => {
        if (topCountries.includes(c.countryId)) score += 2
      })
      
      // Tags/Từ khóa: +1 điểm cho mỗi tag trùng khớp
      if (movie.tags) {
        const mTags = movie.tags.split(',').map(t => t.trim().toLowerCase())
        mTags.forEach(t => {
          if (topTags.includes(t)) score += 1
        })
      }

      return { ...movie, _score: score }
    })

    // 6. Sắp xếp danh sách theo Điểm giảm dần -> Rating giảm dần -> Lượt xem giảm dần
    scoredCandidates.sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score
      if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0)
      return b.viewCount - a.viewCount
    })

    // Cắt lấy số lượng giới hạn và xoá metadata
    finalRecommendations = scoredCandidates.slice(0, limit).map(r => {
      const { _score, tags: _tags, ...rest } = r
      return rest
    })
  }

  // 7. Nếu không đủ số lượng limit, bổ sung thêm trending
  if (finalRecommendations.length < limit) {
    const additional = await prisma.movie.findMany({
      where: {
        ...PUBLISHED_FILTER,
        id: { notIn: [...watchedMovieIds, ...finalRecommendations.map(m => m.id)] }
      },
      select: CARD_SELECT,
      orderBy: { viewCount: 'desc' },
      take: limit - finalRecommendations.length,
    })
    finalRecommendations.push(...additional)
  }

  await setCache(cacheKey, finalRecommendations, 3600)
  return finalRecommendations
}
