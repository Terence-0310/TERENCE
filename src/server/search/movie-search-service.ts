// ============================================
// Movie Search Service
// ============================================
// Search + suggest with graceful Prisma fallback when ES is offline.

import { getClient, getMoviesIndex, isAvailable } from './elastic-client'
import { prisma } from '@/lib/db/prisma'

// ─── Search Result Types ────────────────────────────────────────

export interface SearchResultItem {
  id: string
  slug: string
  title: string
  originalTitle: string | null
  year: number | null
  contentType: string
  quality: string | null
  language: string | null
  thumbUrl: string | null
  posterUrl: string | null
  rating: number
  episodeCurrent: string | null
  episodeTotal: number | null
  categories: string[]
  countries: string[]
  score: number
}

export interface SearchResult {
  items: SearchResultItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
  source: 'elasticsearch' | 'prisma_fallback'
}

export interface SuggestItem {
  id: string
  slug: string
  title: string
  originalTitle: string | null
  year: number | null
  contentType: string
  thumbUrl: string | null
}

// ─── Elasticsearch Search ───────────────────────────────────────

async function searchElastic(
  query: string,
  page: number,
  perPage: number,
  filters: { contentType?: string; year?: number; category?: string; country?: string }
): Promise<SearchResult> {
  const client = getClient()
  const index = getMoviesIndex()
  const from = (page - 1) * perPage

  // Build filter clauses
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterClauses: any[] = [{ term: { isActive: true } }]
  if (filters.contentType) filterClauses.push({ term: { contentType: filters.contentType } })
  if (filters.year) filterClauses.push({ term: { year: filters.year } })
  if (filters.category) filterClauses.push({ term: { categories: filters.category } })
  if (filters.country) filterClauses.push({ term: { countries: filters.country } })

  const body = {
    from,
    size: perPage,
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query,
              fields: [
                'title^3',
                'originalTitle^2.5',
                'titleSuggest^2',
                'actors^1.5',
                'directors^1.5',
                'description',
              ],
              type: 'best_fields' as const,
              fuzziness: 'AUTO' as const,
              prefix_length: 1,
            },
          },
        ],
        filter: filterClauses,
      },
    },
    _source: [
      'id', 'slug', 'title', 'originalTitle', 'year', 'contentType',
      'quality', 'language', 'thumbUrl', 'posterUrl', 'rating',
      'episodeCurrent', 'episodeTotal', 'categories', 'countries',
    ],
  }

  const result = await client.search({ index, from, size: perPage, query: body.query, _source: body._source as string[] })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hits = (result as any).hits || result
  const totalVal = typeof hits.total === 'object' ? hits.total.value : (hits.total || 0)
  const items: SearchResultItem[] = (hits.hits || []).map((hit: { _source: Record<string, unknown>; _score: number }) => ({
    ...hit._source,
    score: hit._score || 0,
    rating: (hit._source.rating as number) || 0,
    categories: (hit._source.categories as string[]) || [],
    countries: (hit._source.countries as string[]) || [],
  })) as SearchResultItem[]

  return {
    items,
    total: totalVal as number,
    page,
    perPage,
    totalPages: Math.ceil((totalVal as number) / perPage),
    source: 'elasticsearch',
  }
}

// ─── Elasticsearch Suggest ──────────────────────────────────────

async function suggestElastic(query: string, limit: number): Promise<SuggestItem[]> {
  const client = getClient()
  const index = getMoviesIndex()

  const body = {
    size: limit,
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query,
              fields: ['titleSuggest^3', 'title^2', 'originalTitle'],
              type: 'best_fields' as const,
              fuzziness: 'AUTO' as const,
              prefix_length: 1,
            },
          },
        ],
        filter: [{ term: { isActive: true } }],
      },
    },
    _source: ['id', 'slug', 'title', 'originalTitle', 'year', 'contentType', 'thumbUrl'],
  }

  const result = await client.search({ index, size: body.size, query: body.query, _source: body._source as string[] })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hits = (result as any).hits || result
  return (hits.hits || []).map((hit: { _source: SuggestItem }) => hit._source)
}

// ─── Prisma Fallback ────────────────────────────────────────────

async function searchPrismaFallback(
  query: string,
  page: number,
  perPage: number,
  filters: { contentType?: string; year?: number; category?: string; country?: string }
): Promise<SearchResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    isActive: true,
    deletedAt: null,
    status: 'published',
    OR: [
      { title: { contains: query } },
      { originalTitle: { contains: query } },
      { actorText: { contains: query } },
      { directorText: { contains: query } },
      { description: { contains: query } },
    ],
  }

  if (filters.contentType) where.contentType = filters.contentType
  if (filters.year) where.year = filters.year
  if (filters.category) where.categories = { some: { category: { slug: filters.category } } }
  if (filters.country) where.countries = { some: { country: { slug: filters.country } } }

  const [movies, total] = await Promise.all([
    prisma.movie.findMany({
      where,
      select: {
        id: true, slug: true, title: true, originalTitle: true, year: true,
        contentType: true, quality: true, language: true,
        thumbUrl: true, posterUrl: true, rating: true,
        episodeCurrent: true, episodeTotal: true,
        categories: { include: { category: { select: { slug: true } } } },
        countries: { include: { country: { select: { slug: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.movie.count({ where }),
  ])

  return {
    items: movies.map(m => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      originalTitle: m.originalTitle,
      year: m.year,
      contentType: m.contentType,
      quality: m.quality,
      language: m.language,
      thumbUrl: m.thumbUrl,
      posterUrl: m.posterUrl,
      rating: m.rating || 0,
      episodeCurrent: m.episodeCurrent,
      episodeTotal: m.episodeTotal,
      categories: m.categories.map(c => c.category.slug),
      countries: m.countries.map(c => c.country.slug),
      score: 0,
    })),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
    source: 'prisma_fallback',
  }
}

async function suggestPrismaFallback(query: string, limit: number): Promise<SuggestItem[]> {
  const movies = await prisma.movie.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      status: 'published',
      OR: [
        { title: { contains: query } },
        { originalTitle: { contains: query } },
      ],
    },
    select: { id: true, slug: true, title: true, originalTitle: true, year: true, contentType: true, thumbUrl: true },
    orderBy: { viewCount: 'desc' },
    take: limit,
  })
  return movies
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Full-text search with ES + Prisma fallback.
 */
export async function searchMovies(
  query: string,
  page: number = 1,
  perPage: number = 20,
  filters: { contentType?: string; year?: number; category?: string; country?: string } = {}
): Promise<SearchResult> {
  if (!query || query.trim().length < 1) {
    return { items: [], total: 0, page, perPage, totalPages: 0, source: 'elasticsearch' }
  }

  try {
    if (await isAvailable()) {
      return await searchElastic(query.trim(), page, perPage, filters)
    }
  } catch (error) {
    console.warn('[Search] ES search failed, falling back to Prisma:', error instanceof Error ? error.message : error)
  }

  return searchPrismaFallback(query.trim(), page, perPage, filters)
}

/**
 * Autocomplete suggest with ES + Prisma fallback.
 */
export async function suggestMovies(query: string, limit: number = 8): Promise<{ items: SuggestItem[]; source: string }> {
  if (!query || query.trim().length < 1) {
    return { items: [], source: 'none' }
  }

  try {
    if (await isAvailable()) {
      const items = await suggestElastic(query.trim(), limit)
      return { items, source: 'elasticsearch' }
    }
  } catch (error) {
    console.warn('[Search] ES suggest failed, falling back to Prisma:', error instanceof Error ? error.message : error)
  }

  const items = await suggestPrismaFallback(query.trim(), limit)
  return { items, source: 'prisma_fallback' }
}
