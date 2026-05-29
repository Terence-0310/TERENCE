// ============================================
// Movie Service — Prisma Query Layer
// ============================================
// All data access for public-facing movie APIs. Uses the shared Prisma singleton.

import { prisma } from '@/lib/db/prisma'
import { getCache, setCache, deleteCache, deleteByPrefix, CACHE_TTL } from '@/src/lib/cache'

// ─── Shared Prisma Select/Include ───────────────────────────────

export const CARD_SELECT = {
  id: true, slug: true, title: true, originalTitle: true,
  contentType: true, year: true, quality: true, language: true,
  thumbUrl: true, posterUrl: true, rating: true,
  episodeCurrent: true, episodeTotal: true,
  isFeatured: true, isTrending: true, viewCount: true,
  tmdbId: true,
  genres: { include: { genre: { select: { name: true } } } },
  countries: { include: { country: { select: { name: true } } } },
} as const

const DETAIL_SELECT = {
  ...CARD_SELECT,
  description: true, shortDescription: true,
  backdropUrl: true, trailerUrl: true, trailerSite: true, trailerKey: true,
  tmdbId: true, imdbId: true, duration: true, ageRating: true,
  tags: true,
  status: true, isRecommended: true, sourceStatus: true,
  seoTitle: true, seoDescription: true,
  matchConfidence: true, metadataSource: true,
  people: {
    include: { person: { select: { id: true, name: true, slug: true, profileUrl: true } } },
    orderBy: { sortOrder: 'asc' as const },
  },
  movieSources: {
    where: { isActive: true },
    select: { id: true, sourceName: true, sourceUrl: true, quality: true, language: true, priority: true },
    orderBy: { priority: 'desc' as const },
  },
  episodes: {
    where: { isActive: true },
    select: {
      id: true, episodeName: true, episodeSlug: true,
      episodeNumber: true, episodeOrder: true,
      streamType: true, streamUrl: true, sourceUrl: true,
      sourceName: true, serverName: true,
      quality: true, language: true, isActive: true,
    },
    orderBy: { episodeOrder: 'asc' as const },
    take: 1, // Just need first episode for preferredPlayback
  },
} as const

const EPISODE_SELECT = {
  id: true, episodeName: true, episodeSlug: true,
  episodeNumber: true, episodeOrder: true,
  streamType: true, streamUrl: true, sourceUrl: true,
  sourceName: true, serverName: true,
  quality: true, language: true, isActive: true,
} as const

// Base filter: active + not deleted
const ACTIVE_FILTER = { isActive: true, deletedAt: null }
export const PUBLISHED_FILTER = { ...ACTIVE_FILTER, status: 'published', isPublished: true }

// ─── Sort ───────────────────────────────────────────────────────

type SortField = 'newest' | 'oldest' | 'popular' | 'rating' | 'year' | 'title'

function buildOrderBy(sort: SortField) {
  switch (sort) {
    case 'newest': return { updatedAt: 'desc' as const }
    case 'oldest': return { createdAt: 'asc' as const }
    case 'popular': return { viewCount: 'desc' as const }
    case 'rating': return { rating: 'desc' as const }
    case 'year': return { year: 'desc' as const }
    case 'title': return { title: 'asc' as const }
    default: return { updatedAt: 'desc' as const }
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export interface MovieListParams {
  page?: number
  perPage?: number
  cursor?: string       // Dùng cho infinite scroll (id)
  noCount?: boolean     // Bỏ qua lấy total record, hữu ích tăng tốc khi lazy-load
  category?: string     // slug
  country?: string      // slug
  year?: number
  contentType?: string  // movie | series | anime
  featured?: boolean
  trending?: boolean
  sort?: SortField
}

/**
 * Get paginated list of movies with filters.
 */
export async function getMovieList(params: MovieListParams = {}) {
  const {
    page = 1,
    perPage = 24,
    cursor,
    noCount = false,
    category,
    country,
    year,
    contentType,
    featured,
    trending,
    sort = 'newest',
  } = params

  const cacheKey = `movies:list:${JSON.stringify(params)}`
  const cached = await getCache<any>(cacheKey)
  if (cached) return cached

  // Nếu dùng cursor, bỏ qua tính toán skip truyền thống
  const skip = cursor ? 1 : (page - 1) * perPage

  const where: any = { ...PUBLISHED_FILTER }

  if (contentType) where.contentType = contentType
  if (year) where.year = year
  if (featured !== undefined) where.isFeatured = featured
  if (trending !== undefined) where.isTrending = trending

  if (category) {
    where.genres = { some: { genre: { slug: category } } }
  }
  if (country) {
    where.countries = { some: { country: { slug: country } } }
  }

  // Tối ưu để lấy thừa 1 item nhằm xác định hasNextPage mà không cần Count()
  const takeAmount = perPage + 1
  
  const queryTasks: Promise<any>[] = [
    prisma.movie.findMany({
      where,
      select: CARD_SELECT,
      orderBy: buildOrderBy(sort),
      cursor: cursor ? { id: cursor } : undefined,
      skip,
      take: takeAmount,
    })
  ]
  
  // Dùng count() khi client bắt buộc cần Total Pages (ví dụ: giao diện List trang 1, 2, 3...)
  // Đối với infinite scroll, truyền noCount=true để tốc độ query nhanh nhất
  if (!noCount) {
    queryTasks.push(prisma.movie.count({ where }))
  }

  const [rawMovies, rawTotal] = await Promise.all(queryTasks)
  
  const hasMore = rawMovies.length > perPage
  const movies = hasMore ? rawMovies.slice(0, perPage) : rawMovies

  // Tính total ảo nếu không query count
  const total = rawTotal ?? (hasMore ? (page * perPage) + 1 : (page - 1) * perPage + movies.length)

  const nextCursor = hasMore ? movies[movies.length - 1].id : null

  const result = { movies, total, page, perPage, nextCursor }
  await setCache(cacheKey, result, CACHE_TTL.LIST)
  return result
}

/**
 * Get movie detail by slug.
 */
export async function getMovieBySlug(slug: string) {
  const cacheKey = `movies:detail:${slug}`
  const cached = await getCache<any>(cacheKey)
  if (cached) return cached

  const movie = await prisma.movie.findFirst({
    where: { slug, ...ACTIVE_FILTER },
    select: DETAIL_SELECT,
  })

  if (movie) await setCache(cacheKey, movie, CACHE_TTL.DETAIL)
  return movie
}

/**
 * Get episodes for a movie by slug, active only.
 */
export async function getEpisodesByMovieSlug(slug: string) {
  const cacheKey = `movies:episodes:${slug}`
  const cached = await getCache<any>(cacheKey)
  if (cached) return cached

  const episodes = await prisma.episode.findMany({
    where: { 
      movie: { slug, ...ACTIVE_FILTER },
      isActive: true 
    },
    select: EPISODE_SELECT,
    orderBy: { episodeOrder: 'asc' },
  })

  await setCache(cacheKey, episodes, CACHE_TTL.EPISODES)
  return episodes
}

/**
 * Home page data: featured, latest, trending, by content type.
 */
export async function getHomeData() {
  const cacheKey = `movies:home`
  const cached = await getCache<any>(cacheKey)
  if (cached) return cached

  const [featured, latest, trending, movies, series, anime] = await Promise.all([
    // Featured movies
    prisma.movie.findMany({
      where: { ...PUBLISHED_FILTER, isFeatured: true },
      select: CARD_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    // Latest updated
    prisma.movie.findMany({
      where: PUBLISHED_FILTER,
      select: CARD_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: 12,
    }),
    // Trending
    prisma.movie.findMany({
      where: { ...PUBLISHED_FILTER, isTrending: true },
      select: CARD_SELECT,
      orderBy: { viewCount: 'desc' },
      take: 12,
    }),
    // Latest movies
    prisma.movie.findMany({
      where: { ...PUBLISHED_FILTER, contentType: 'movie' },
      select: CARD_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: 12,
    }),
    // Latest series
    prisma.movie.findMany({
      where: { ...PUBLISHED_FILTER, contentType: 'series' },
      select: CARD_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: 12,
    }),
    // Latest anime
    prisma.movie.findMany({
      where: { ...PUBLISHED_FILTER, contentType: 'anime' },
      select: CARD_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: 12,
    }),
  ])

  const result = { featured, latest, trending, movies, series, anime }
  await setCache(cacheKey, result, CACHE_TTL.HOME)
  return result
}

/**
 * Get top 5 most liked/favorited movies
 */
export async function getMostLikedMovies() {
  const favoriteGroups = await prisma.favorite.groupBy({
    by: ['movieId'],
    _count: { movieId: true },
    orderBy: { _count: { movieId: 'desc' } },
    take: 5,
  })

  if (favoriteGroups.length === 0) return []

  const movieIds = favoriteGroups.map((g) => g.movieId)
  const movies = await prisma.movie.findMany({
    where: { id: { in: movieIds }, isActive: true },
    select: { id: true, title: true, slug: true, posterUrl: true, thumbUrl: true },
  })

  const movieMap = new Map(movies.map((m) => [m.id, m]))
  return favoriteGroups
    .map((g, i) => {
      const movie = movieMap.get(g.movieId)
      if (!movie) return null
      return {
        rank: i + 1,
        movie: {
          id: movie.id,
          title: movie.title,
          slug: movie.slug,
          posterUrl: movie.posterUrl || movie.thumbUrl,
        },
        favoriteCount: g._count.movieId,
      }
    })
    .filter(Boolean)
}

/**
 * Get top 5 trending movies by view count
 */
export async function getTrendingMovies() {
  const movies = await prisma.movie.findMany({
    where: { isActive: true, isPublished: true },
    orderBy: { viewCount: 'desc' },
    take: 5,
    select: { id: true, title: true, slug: true, posterUrl: true, thumbUrl: true, viewCount: true },
  })

  return movies.map((m, i) => ({
    rank: i + 1,
    movie: {
      id: m.id,
      title: m.title,
      slug: m.slug,
      posterUrl: m.posterUrl || m.thumbUrl,
    },
    viewCount: m.viewCount,
  }))
}


// ═══════════════════════════════════════════════════════════════
// ADMIN MUTATION & QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const AdminMovieService = {
  /**
   * Retrieves a paginated list of movies for the admin dashboard.
   * Includes total count for pagination UI.
   * 
   * @param where - Prisma filter conditions
   * @param skip - Number of records to skip
   * @param take - Number of records to return
   * @param orderBy - Sorting criteria
   * @returns A tuple containing the array of movies and total count
   */
  async getPaginatedMovies(where: any, skip: number, take: number, orderBy: any) {
    return Promise.all([
      prisma.movie.findMany({
        where, skip, take, orderBy,
        include: { _count: { select: { episodes: true } } },
      }),
      prisma.movie.count({ where }),
    ])
  },

  /**
   * Creates a new movie record and invalidates relevant caches.
   * 
   * @param data - The movie creation payload
   * @param createdBy - ID or name of the admin creating the movie
   * @returns The created movie record
   */
  async createMovie(data: any, createdBy: string) {
    // Sync isPublished with status
    const isPublished = data.status === 'published'
    const result = await prisma.movie.create({
      data: { ...data, isPublished, createdBy },
    })
    
    // Invalidate caches
    await deleteByPrefix('movies:list:')
    await deleteByPrefix('movies:home')
    
    return result
  },

  /**
   * Retrieves full details of a movie by ID, including episodes, genres,
   * countries, cast/crew, and streaming sources.
   * 
   * @param id - The unique movie ID
   * @returns The movie record with all related entities
   */
  async getMovieById(id: string) {
    return prisma.movie.findUnique({
      where: { id },
      include: { 
        episodes: { orderBy: { sortOrder: 'asc' } },
        genres: { include: { genre: true } },
        countries: { include: { country: true } },
        people: { include: { person: true } },
        movieSources: true,
      },
    })
  },

  /**
   * Finds a single movie by its slug.
   * 
   * @param slug - The URL-friendly movie slug
   * @returns The movie record or null if not found
   */
  async getMovieBySlug(slug: string) {
    return prisma.movie.findUnique({ where: { slug } })
  },

  /**
   * Updates an existing movie, syncs its publish state, and clears caches.
   * 
   * @param id - The unique movie ID to update
   * @param data - The update payload
   * @param updatedBy - ID or name of the admin performing the update
   * @returns The updated movie record
   */
  async updateMovie(id: string, data: any, updatedBy: string) {
    const updateData: Record<string, unknown> = { ...data, updatedBy }
    if (data.status) {
      updateData.isPublished = data.status === 'published'
    }
    const result = await prisma.movie.update({ where: { id }, data: updateData })

    // Invalidate caches
    await deleteByPrefix('movies:list:')
    await deleteByPrefix('movies:home')
    if (result.slug) {
      await deleteCache(`movies:detail:${result.slug}`)
      await deleteCache(`movies:episodes:${result.slug}`)
    }

    return result
  },

  /**
   * Soft deletes a movie by setting the deletedAt timestamp and unpublishing it.
   * 
   * @param id - The unique movie ID to soft delete
   * @param updatedBy - ID or name of the admin performing the action
   * @returns The updated (archived) movie record
   */
  async softDeleteMovie(id: string, updatedBy: string) {
    const result = await prisma.movie.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'archived', isPublished: false, updatedBy },
    })

    // Invalidate caches
    await deleteByPrefix('movies:list:')
    await deleteByPrefix('movies:home')
    if (result.slug) {
      await deleteCache(`movies:detail:${result.slug}`)
      await deleteCache(`movies:episodes:${result.slug}`)
    }

    return result
  }
}
