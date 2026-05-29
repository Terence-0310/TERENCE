// ============================================
// Movie Service — all TMDB movie operations
// ============================================

import { tmdbFetch, tmdbFetchSafe } from '@/src/be/modules/tmdb/legacy/client'
import { mapMovie, mapMovieDetail, mapGenre } from '@/src/be/modules/tmdb/legacy/mapper'
import type { TmdbPaginatedResponse, TmdbMovie, TmdbMovieDetail, TmdbCreditsResponse, TmdbVideosResponse, TmdbGenreListResponse } from '@/types/tmdb'
import type { Movie, MovieDetail, Genre, PaginatedResult } from '@/types/movie'
import { withCache } from '@/src/lib/redis'

// Helper: filter playable movies
async function filterValidPlayable(movies: Movie[]): Promise<Movie[]> {
  const validMovies: Movie[] = []
  
  // 1. Pre-filter by poster
  const posterMovies = movies.filter(m => m.posterUrl && m.posterUrl !== '/placeholder.jpg')

  // If deployed on Vultr/Cloud, OPhim may block the IP. We can bypass it if env is set.
  if (process.env.DISABLE_OPHIM_CHECK === 'true') {
    return posterMovies;
  }

  // Process in small batches to respect rate limits
  for (let i = 0; i < posterMovies.length; i += 4) {
    const batch = posterMovies.slice(i, i + 4)
    
    const results = await Promise.all(batch.map(async (m) => {
      // 2. Check trailer via TMDB
      const videos = await tmdbFetchSafe<TmdbVideosResponse>(`/movie/${m.id}/videos`, { language: 'en-US' })
      const hasTrailer = videos?.results?.some(v => v.type === 'Trailer' && v.site === 'YouTube')
      if (!hasTrailer) return null

      // 3. Check OPhim stream availability
      try {
        const query = m.originalTitle || m.title
        const res = await fetch(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(query)}`)
        const json = await res.json()
        if (json.status === 'success' && json.data?.items?.length > 0) {
          return m
        }
        
        // Try fallback mapping using Vietnamese title
        if (m.originalTitle && m.title !== m.originalTitle) {
          const res2 = await fetch(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(m.title)}`)
          const json2 = await res2.json()
          if (json2.status === 'success' && json2.data?.items?.length > 0) {
            return m
          }
        }
      } catch { }
      return null
    }))

    validMovies.push(...results.filter((m): m is Movie => m !== null))
  }
  return validMovies
}

// ── Helper: map TMDB paginated → app paginated ──
async function mapPaginated(data: TmdbPaginatedResponse<TmdbMovie>): Promise<PaginatedResult<Movie>> {
  const rawItems = data.results.map(mapMovie)
  const filteredItems = await filterValidPlayable(rawItems)
  
  return {
    items: filteredItems,
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
  }
}

// ── List endpoints ──

export async function getTrending(page = 1): Promise<PaginatedResult<Movie>> {
  return withCache(`movies:trending:page:${page}`, 1800, async () => {
    const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>('/trending/movie/week', {
      params: { page },
      revalidate: 1800,
    })
    return await mapPaginated(data)
  })
}

export async function getPopular(page = 1): Promise<PaginatedResult<Movie>> {
  return withCache(`movies:popular:page:${page}`, 3600, async () => {
    const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>('/movie/popular', {
      params: { page },
      revalidate: 3600,
    })
    return await mapPaginated(data)
  })
}

export async function getTopRated(page = 1): Promise<PaginatedResult<Movie>> {
  return withCache(`movies:top_rated:page:${page}`, 3600, async () => {
    const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>('/movie/top_rated', {
      params: { page },
      revalidate: 3600,
    })
    return await mapPaginated(data)
  })
}

export async function getNowPlaying(page = 1): Promise<PaginatedResult<Movie>> {
  return withCache(`movies:now_playing:page:${page}`, 1800, async () => {
    const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>('/movie/now_playing', {
      params: { page },
      revalidate: 1800,
    })
    return await mapPaginated(data)
  })
}

export async function getUpcoming(page = 1): Promise<PaginatedResult<Movie>> {
  return withCache(`movies:upcoming:page:${page}`, 3600, async () => {
    const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>('/movie/upcoming', {
      params: { page },
      revalidate: 3600,
    })
    return await mapPaginated(data)
  })
}

// ── Detail endpoint ──

export async function getMovieDetail(id: number): Promise<MovieDetail> {
  return withCache(`movie:detail:${id}`, 3600, async () => {
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
  })
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
  return await mapPaginated(data)
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
  return withCache(`movies:country:${countryCode}:page:${page}`, 3600, async () => {
    const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>('/discover/movie', {
      params: {
        with_origin_country: countryCode,
        sort_by: 'popularity.desc',
        page,
      },
      revalidate: 3600,
    })
    return await mapPaginated(data)
  })
}

