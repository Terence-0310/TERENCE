// ============================================
// Movie Query Helpers (Scopes)
// ============================================
// Prisma "where" clause builders equivalent to Laravel scopes.
// Usage:
//   import { movieScopes } from '@/lib/db/movie-queries'
//   const movies = await prisma.movie.findMany({
//     where: { ...movieScopes.active(), ...movieScopes.featured() }
//   })

import { Prisma } from '@prisma/client'

// ─── Scope-like Where Clauses ────────────────────────────────────

export const movieScopes = {
  /**
   * scopeActive — only active, non-deleted movies
   */
  active(): Prisma.MovieWhereInput {
    return {
      isActive: true,
      deletedAt: null,
    }
  },

  /**
   * scopeFeatured — featured movies that are also active
   */
  featured(): Prisma.MovieWhereInput {
    return {
      isFeatured: true,
      isActive: true,
      deletedAt: null,
    }
  },

  /**
   * scopePublished — published movies with a publishedAt date in the past
   */
  published(): Prisma.MovieWhereInput {
    return {
      isPublished: true,
      isActive: true,
      status: 'published',
      deletedAt: null,
    }
  },

  /**
   * scopeTrending — trending movies
   */
  trending(): Prisma.MovieWhereInput {
    return {
      isTrending: true,
      isActive: true,
      isPublished: true,
      deletedAt: null,
    }
  },

  /**
   * scopeByContentType — filter by content type
   */
  byContentType(type: string): Prisma.MovieWhereInput {
    return {
      contentType: type,
      isActive: true,
      deletedAt: null,
    }
  },

  /**
   * scopeByYear — filter by release year
   */
  byYear(year: number): Prisma.MovieWhereInput {
    return {
      year,
      isActive: true,
      deletedAt: null,
    }
  },

  /**
   * scopeRecentlySynced — movies synced within a given number of hours
   */
  recentlySynced(hours: number = 24): Prisma.MovieWhereInput {
    const since = new Date()
    since.setHours(since.getHours() - hours)
    return {
      lastSyncedAt: {
        gte: since,
      },
    }
  },

  /**
   * scopeNeedsSync — movies that have never been synced or were synced more than N hours ago
   */
  needsSync(hoursThreshold: number = 24): Prisma.MovieWhereInput {
    const threshold = new Date()
    threshold.setHours(threshold.getHours() - hoursThreshold)
    return {
      OR: [
        { lastSyncedAt: null },
        { lastSyncedAt: { lt: threshold } },
      ],
    }
  },

  /**
   * scopeHasExternalId — movies that have at least one external ID
   */
  hasExternalId(): Prisma.MovieWhereInput {
    return {
      OR: [
        { ophimId: { not: null } },
        { tmdbId: { not: null } },
        { imdbId: { not: null } },
      ],
    }
  },

  /**
   * scopeSearchable — basic text search on title/originalTitle
   */
  searchable(query: string): Prisma.MovieWhereInput {
    const q = query.replace(/\\/g, '')
    return {
      OR: [
        { title: { contains: q, mode: 'insensitive' } as any },
        { originalTitle: { contains: q, mode: 'insensitive' } as any },
        { slug: { contains: q, mode: 'insensitive' } as any },
        { actorText: { contains: q, mode: 'insensitive' } as any },
        { directorText: { contains: q, mode: 'insensitive' } as any },
      ],
      deletedAt: null,
    }
  },
}

// ─── Common Include Patterns ─────────────────────────────────────
// NOTE: Genre (MovieGenre) is the canonical taxonomy direction.
//       Legacy categories kept for backward compatibility until fully migrated.

export const movieIncludes = {
  /**
   * Basic info with relations for listing cards
   */
  card(): Prisma.MovieInclude {
    return {
      genres: { include: { genre: true } },
      categories: { include: { category: true } },
      countries: { include: { country: true } },
    }
  },

  /**
   * Full detail with all relations
   */
  detail(): Prisma.MovieInclude {
    return {
      episodes: {
        where: { isActive: true },
        orderBy: { episodeOrder: 'asc' },
      },
      genres: { include: { genre: true } },
      categories: { include: { category: true } },
      countries: { include: { country: true } },
      people: {
        include: { person: true },
        orderBy: { sortOrder: 'asc' },
      },
      movieSources: {
        where: { isActive: true },
        orderBy: { priority: 'desc' },
      },
    }
  },

  /**
   * For sync operations — includes sync logs
   */
  sync(): Prisma.MovieInclude {
    return {
      syncLogs: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      movieSources: true,
    }
  },
}

// ─── Common OrderBy Patterns ─────────────────────────────────────

export const movieOrderBy = {
  newest(): Prisma.MovieOrderByWithRelationInput {
    return { createdAt: 'desc' }
  },
  popular(): Prisma.MovieOrderByWithRelationInput {
    return { viewCount: 'desc' }
  },
  recentlyUpdated(): Prisma.MovieOrderByWithRelationInput {
    return { updatedAt: 'desc' }
  },
  recentlySynced(): Prisma.MovieOrderByWithRelationInput {
    return { lastSyncedAt: 'desc' }
  },
  alphabetical(): Prisma.MovieOrderByWithRelationInput {
    return { title: 'asc' }
  },
}
