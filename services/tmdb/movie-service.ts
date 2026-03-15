// ============================================
// Movie Service — all TMDB movie operations
// ============================================

import { tmdbFetch, tmdbFetchSafe } from '@/lib/tmdb/client'
import { mapMovie, mapMovieDetail, mapGenre } from '@/lib/tmdb/mapper'
import type { TmdbPaginatedResponse, TmdbMovie, TmdbMovieDetail, TmdbCreditsResponse, TmdbVideosResponse, TmdbGenreListResponse } from '@/types/tmdb'
import type { Movie, MovieDetail, Genre, PaginatedResult } from '@/types/movie'

// ── Helper: map TMDB paginated → app paginated ──
function mapPaginated(data: TmdbPaginatedResponse<TmdbMovie>): PaginatedResult<Movie> {
  return {
    items: data.results.map(mapMovie),
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
  }
}

// ── List endpoints ──

export async function getTrending(page = 1): Promise<PaginatedResult<Movie>> {
  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>('/trending/movie/week', {
    params: { page },
    revalidate: 1800,
  })
  return mapPaginated(data)
}

export async function getPopular(page = 1): Promise<PaginatedResult<Movie>> {
  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>('/movie/popular', {
    params: { page },
    revalidate: 3600,
  })
  return mapPaginated(data)
}

export async function getTopRated(page = 1): Promise<PaginatedResult<Movie>> {
  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>('/movie/top_rated', {
    params: { page },
    revalidate: 3600,
  })
  return mapPaginated(data)
}

export async function getNowPlaying(page = 1): Promise<PaginatedResult<Movie>> {
  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>('/movie/now_playing', {
    params: { page },
    revalidate: 1800,
  })
  return mapPaginated(data)
}

export async function getUpcoming(page = 1): Promise<PaginatedResult<Movie>> {
  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>('/movie/upcoming', {
    params: { page },
    revalidate: 3600,
  })
  return mapPaginated(data)
}

// ── Detail endpoint ──

export async function getMovieDetail(id: number): Promise<MovieDetail> {
  // Detail is required — will throw if fails
  const detail = await tmdbFetch<TmdbMovieDetail>(`/movie/${id}`, { revalidate: 3600 })

  // Credits, videos, similar are optional — use safe fetch so page doesn't crash
  const [credits, videos, similar] = await Promise.all([
    tmdbFetchSafe<TmdbCreditsResponse>(`/movie/${id}/credits`, { revalidate: 86400 }),
    tmdbFetchSafe<TmdbVideosResponse>(`/movie/${id}/videos`, {
      language: 'en-US', // Trailers usually in English
      revalidate: 86400,
    }),
    tmdbFetchSafe<TmdbPaginatedResponse<TmdbMovie>>(`/movie/${id}/similar`, { revalidate: 86400 }),
  ])

  return mapMovieDetail(
    detail,
    credits ?? undefined,
    videos?.results,
    similar?.results?.slice(0, 12),
  )
}

// ── Discover by genre ──

export async function getMoviesByGenre(genreId: number, page = 1): Promise<PaginatedResult<Movie>> {
  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>('/discover/movie', {
    params: {
      with_genres: genreId,
      sort_by: 'popularity.desc',
      page,
    },
    revalidate: 3600,
  })
  return mapPaginated(data)
}

// ── Genres list ──

export async function getGenres(): Promise<Genre[]> {
  const data = await tmdbFetch<TmdbGenreListResponse>('/genre/movie/list', {
    revalidate: 86400,
  })
  return data.genres.map(mapGenre)
}

// ── Discover by country ──

export async function getMoviesByCountry(countryCode: string, page = 1): Promise<PaginatedResult<Movie>> {
  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>('/discover/movie', {
    params: {
      with_origin_country: countryCode,
      sort_by: 'popularity.desc',
      page,
    },
    revalidate: 3600,
  })
  return mapPaginated(data)
}

