// ============================================
// TMDB Upcoming Movies Service — server-side (optimized)
// ============================================
// Leverages the existing TMDB client (lib/tmdb/client.ts).
//
// Optimizations:
// - Region fallback (VN → US when results too few)
// - Filters out movies without poster/backdrop
// - Sorts by release_date ascending → popularity desc
// - Deduplicates across region fallback

import { tmdbFetch } from '@/src/be/modules/tmdb/legacy/client'
import { mapTmdbUpcoming } from './mappers'
import type { UpcomingMovieItem } from './legacy-types'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'tmdb-news' })

// ── Raw TMDB response shape ──

interface TmdbPaginatedResult {
  page: number
  total_pages: number
  total_results: number
  results: Array<{
    id?: number
    title?: string
    original_title?: string
    overview?: string
    poster_path?: string | null
    backdrop_path?: string | null
    release_date?: string
    vote_average?: number
    popularity?: number
    genre_ids?: number[]
  }>
}

/** Min items threshold before triggering region fallback */
const MIN_RESULTS_THRESHOLD = 5

// ── Service Functions ──

/**
 * Get upcoming movies from TMDB with smart region fallback.
 * If `region=VN` returns too few results, supplements with US data.
 */
export async function getUpcomingMovies(
  region = 'VN',
  page = 1,
): Promise<{ items: UpcomingMovieItem[]; total: number }> {
  try {
    const data = await tmdbFetch<TmdbPaginatedResult>('/movie/upcoming', {
      params: { region, page },
      revalidate: 21600, // 6 hours
    })

    let items = mapTmdbUpcoming(data.results, {
      filterFuture: true,
      requireImage: true,
      minPopularity: 10,
    })

    // Region fallback: supplement with US if too few VN results
    if (items.length < MIN_RESULTS_THRESHOLD && region !== 'US') {
      log.info({ count: items.length, region }, 'Few upcoming results, supplementing with US')
      try {
        const fallbackData = await tmdbFetch<TmdbPaginatedResult>('/movie/upcoming', {
          params: { region: 'US', page: 1 },
          revalidate: 21600,
        })
        const fallbackItems = mapTmdbUpcoming(fallbackData.results, {
          filterFuture: true,
          requireImage: true,
          minPopularity: 15, // Be even stricter for US fallback
        })
        items = deduplicateMovies([...items, ...fallbackItems])
      } catch {
        // Fallback failed, use what we have
      }
    }

    return {
      items,
      total: data.total_results,
    }
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'Failed to fetch upcoming movies')
    return { items: [], total: 0 }
  }
}

/**
 * Search movies by title on TMDB.
 */
export async function searchMoviesByTitle(
  query: string,
  page = 1,
): Promise<{ items: UpcomingMovieItem[]; total: number }> {
  if (!query.trim()) return { items: [], total: 0 }

  try {
    const data = await tmdbFetch<TmdbPaginatedResult>('/search/movie', {
      params: { query, page },
      revalidate: 3600,
    })

    return {
      items: mapTmdbUpcoming(data.results),
      total: data.total_results,
    }
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'Failed to search movies')
    return { items: [], total: 0 }
  }
}

/**
 * Get trending movies from TMDB (this week).
 */
export async function getTrendingMoviesForNews(
  page = 1,
): Promise<{ items: UpcomingMovieItem[]; total: number }> {
  try {
    const data = await tmdbFetch<TmdbPaginatedResult>('/trending/movie/week', {
      params: { page },
      revalidate: 3600,
    })

    return {
      items: mapTmdbUpcoming(data.results),
      total: data.total_results,
    }
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'Failed to fetch trending')
    return { items: [], total: 0 }
  }
}

/**
 * Discover movies with custom filters.
 */
export async function discoverMovies(params: {
  sortBy?: string
  withGenres?: string
  region?: string
  releaseDateGte?: string
  releaseDateLte?: string
  page?: number
}): Promise<{ items: UpcomingMovieItem[]; total: number }> {
  try {
    const data = await tmdbFetch<TmdbPaginatedResult>('/discover/movie', {
      params: {
        sort_by: params.sortBy ?? 'popularity.desc',
        with_genres: params.withGenres,
        region: params.region ?? 'VN',
        'primary_release_date.gte': params.releaseDateGte,
        'primary_release_date.lte': params.releaseDateLte,
        page: params.page ?? 1,
      },
      revalidate: 3600,
    })

    return {
      items: mapTmdbUpcoming(data.results),
      total: data.total_results,
    }
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'Failed to discover movies')
    return { items: [], total: 0 }
  }
}

// ── Helpers ──

/** Deduplicate movies by TMDB ID */
function deduplicateMovies(movies: UpcomingMovieItem[]): UpcomingMovieItem[] {
  const seen = new Set<number>()
  return movies.filter((m) => {
    if (seen.has(m.tmdbId)) return false
    seen.add(m.tmdbId)
    return true
  })
}
