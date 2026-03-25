// ============================================
// Movie Service — Prisma Query Layer
// ============================================
// All data access for public-facing movie APIs. Uses the shared Prisma singleton.

import { prisma } from '@/lib/db/prisma'

// ─── Shared Prisma Select/Include ───────────────────────────────

const CARD_SELECT = {
  id: true, slug: true, title: true, originalTitle: true,
  contentType: true, year: true, quality: true, language: true,
  thumbUrl: true, posterUrl: true, rating: true,
  episodeCurrent: true, episodeTotal: true,
  isFeatured: true, isTrending: true, viewCount: true,
  categories: { include: { category: { select: { name: true } } } },
  countries: { include: { country: { select: { name: true } } } },
} as const

const DETAIL_SELECT = {
  ...CARD_SELECT,
  description: true, shortDescription: true,
  backdropUrl: true, trailerUrl: true, trailerSite: true, trailerKey: true,
  tmdbId: true, imdbId: true, duration: true, ageRating: true,
  actorText: true, directorText: true, tags: true,
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
const PUBLISHED_FILTER = { ...ACTIVE_FILTER, status: 'published', isPublished: true }

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
    category,
    country,
    year,
    contentType,
    featured,
    trending,
    sort = 'newest',
  } = params

  const skip = (page - 1) * perPage

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { ...PUBLISHED_FILTER }

  if (contentType) where.contentType = contentType
  if (year) where.year = year
  if (featured !== undefined) where.isFeatured = featured
  if (trending !== undefined) where.isTrending = trending

  if (category) {
    where.categories = { some: { category: { slug: category } } }
  }
  if (country) {
    where.countries = { some: { country: { slug: country } } }
  }

  const [movies, total] = await Promise.all([
    prisma.movie.findMany({
      where,
      select: CARD_SELECT,
      orderBy: buildOrderBy(sort),
      skip,
      take: perPage,
    }),
    prisma.movie.count({ where }),
  ])

  return { movies, total, page, perPage }
}

/**
 * Get movie detail by slug.
 */
export async function getMovieBySlug(slug: string) {
  return prisma.movie.findFirst({
    where: { slug, ...ACTIVE_FILTER },
    select: DETAIL_SELECT,
  })
}

/**
 * Get episodes for a movie by slug, active only.
 */
export async function getEpisodesByMovieSlug(slug: string) {
  const movie = await prisma.movie.findFirst({
    where: { slug, ...ACTIVE_FILTER },
    select: { id: true },
  })
  if (!movie) return null

  const episodes = await prisma.episode.findMany({
    where: { movieId: movie.id, isActive: true },
    select: EPISODE_SELECT,
    orderBy: { episodeOrder: 'asc' },
  })

  return episodes
}

/**
 * Home page data: featured, latest, trending, by content type.
 */
export async function getHomeData() {
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

  return { featured, latest, trending, movies, series, anime }
}
