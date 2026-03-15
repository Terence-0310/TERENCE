// ============================================
// Search Service
// ============================================

import { tmdbFetch } from '@/lib/tmdb/client'
import { mapMovie } from '@/lib/tmdb/mapper'
import type { TmdbPaginatedResponse, TmdbMovie } from '@/types/tmdb'
import type { Movie, PaginatedResult } from '@/types/movie'

export async function searchMovies(query: string, page = 1): Promise<PaginatedResult<Movie>> {
  if (!query.trim()) {
    return { items: [], page: 1, totalPages: 0, totalResults: 0 }
  }

  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>('/search/movie', {
    params: { query: query.trim(), page, include_adult: 'false' },
    revalidate: 600,
  })

  return {
    items: data.results.map(mapMovie),
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
  }
}
