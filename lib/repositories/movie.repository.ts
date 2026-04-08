// ============================================
// Movie Repository — Database access layer
// ============================================
// All Prisma movie queries go through here.
// No business logic — just data access + shaping.

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/auth/db'

// ── Include patterns for card and detail queries ──

const MOVIE_CARD_INCLUDE = {
  genres: {
    include: { genre: { select: { id: true, name: true, slug: true } } },
  },
  countries: {
    include: { country: { select: { id: true, name: true, slug: true, code: true } } },
  },
} satisfies Prisma.MovieInclude

const MOVIE_DETAIL_INCLUDE = {
  ...MOVIE_CARD_INCLUDE,
  episodes: {
    where: { isActive: true },
    orderBy: { episodeOrder: 'asc' as const },
    select: {
      id: true,
      episodeName: true,
      episodeNumber: true,
      episodeSlug: true,
      title: true,
      slug: true,
      streamType: true,
      streamUrl: true,
      duration: true,
      quality: true,
      status: true,
      thumbnailUrl: true,
      viewCount: true,
    },
  },
  people: {
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' as const },
    include: {
      person: {
        select: {
          id: true,
          name: true,
          slug: true,
          profileUrl: true,
          knownFor: true,
        },
      },
    },
  },
  reviews: {
    where: { status: 'approved' },
    orderBy: { createdAt: 'desc' as const },
    take: 10,
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
  },
} satisfies Prisma.MovieInclude

// ── Base where clauses ──

const ACTIVE_FILTER: Prisma.MovieWhereInput = {
  isActive: true,
  deletedAt: null,
}

const PUBLISHED_FILTER: Prisma.MovieWhereInput = {
  ...ACTIVE_FILTER,
  isPublished: true,
  status: 'published',
}

// ── Repository ──

export const movieRepository = {
  /**
   * List movies with pagination, filtering, sorting
   */
  async findMany(opts: {
    page: number
    limit: number
    where?: Prisma.MovieWhereInput
    orderBy?: Prisma.MovieOrderByWithRelationInput | Prisma.MovieOrderByWithRelationInput[]
    includeRelations?: boolean
  }) {
    const { page, limit, where = {}, orderBy = { updatedAt: 'desc' }, includeRelations = true } = opts
    const skip = (page - 1) * limit

    const combinedWhere = { ...PUBLISHED_FILTER, ...where }

    const [data, total] = await Promise.all([
      prisma.movie.findMany({
        where: combinedWhere,
        include: includeRelations ? MOVIE_CARD_INCLUDE : undefined,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.movie.count({ where: combinedWhere }),
    ])

    return { data, total, page, limit }
  },

  /**
   * Get single movie by slug or id
   */
  async findBySlugOrId(slugOrId: string) {
    const movie = await prisma.movie.findFirst({
      where: {
        OR: [
          { slug: slugOrId },
          { id: slugOrId },
        ],
        ...ACTIVE_FILTER,
      },
      include: MOVIE_DETAIL_INCLUDE,
    })
    return movie
  },

  /**
   * Get featured movies for hero banner
   */
  async findFeatured(limit = 6) {
    return prisma.movie.findMany({
      where: { ...PUBLISHED_FILTER, isFeatured: true },
      include: MOVIE_CARD_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
  },

  /**
   * Get trending movies
   */
  async findTrending(limit = 20) {
    return prisma.movie.findMany({
      where: { ...PUBLISHED_FILTER, isTrending: true },
      include: MOVIE_CARD_INCLUDE,
      orderBy: { viewCount: 'desc' },
      take: limit,
    })
  },

  /**
   * Get latest updated movies
   */
  async findLatest(limit = 20) {
    return prisma.movie.findMany({
      where: PUBLISHED_FILTER,
      include: MOVIE_CARD_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
  },

  /**
   * Get movies by content type (movie | series | anime)
   */
  async findByType(type: string, page: number, limit: number) {
    return this.findMany({
      page,
      limit,
      where: { contentType: type },
      orderBy: { updatedAt: 'desc' },
    })
  },

  /**
   * Get movies by genre slug
   */
  async findByGenre(genreSlug: string, page: number, limit: number) {
    return this.findMany({
      page,
      limit,
      where: {
        genres: {
          some: { genre: { slug: genreSlug } },
        },
      },
    })
  },

  /**
   * Get movies by country slug
   */
  async findByCountry(countrySlug: string, page: number, limit: number) {
    return this.findMany({
      page,
      limit,
      where: {
        countries: {
          some: { country: { slug: countrySlug } },
        },
      },
    })
  },

  /**
   * Search movies by keyword
   */
  async search(query: string, page: number, limit: number) {
    const q = query.replace(/\\/g, '').trim()
    if (!q) return { data: [], total: 0, page, limit }

    return this.findMany({
      page,
      limit,
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } as any },
          { originalTitle: { contains: q, mode: 'insensitive' } as any },
          { actorText: { contains: q, mode: 'insensitive' } as any },
          { directorText: { contains: q, mode: 'insensitive' } as any },
          { slug: { contains: q.toLowerCase(), mode: 'insensitive' } as any },
        ],
      },
      orderBy: { viewCount: 'desc' },
    })
  },

  /**
   * Increment view count
   */
  async incrementView(id: string) {
    return prisma.movie.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { id: true, viewCount: true },
    })
  },

  /**
   * Get recently updated movies (for schedule-like display)
   */
  async findRecentlyUpdated(days = 7, limit = 30) {
    const since = new Date()
    since.setDate(since.getDate() - days)

    return prisma.movie.findMany({
      where: {
        ...PUBLISHED_FILTER,
        updatedAt: { gte: since },
      },
      include: MOVIE_CARD_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
  },
}
