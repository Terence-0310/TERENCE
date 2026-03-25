// ============================================
// TMDB HTTP Client
// ============================================
// Server-side only. Wraps TMDB v3 API with proper auth, timeout, and rate-limit handling.

import type {
  TmdbSearchResponse, TmdbSearchMovieResult, TmdbSearchTvResult,
  TmdbExternalIds, TmdbVideosResponse, TmdbCreditsResponse,
  TmdbMovieDetail, TmdbTvDetail,
} from './types'

const DEFAULT_BASE_URL = 'https://api.themoviedb.org/3'
const DEFAULT_IMAGE_BASE = 'https://image.tmdb.org/t/p'
const TIMEOUT_MS = 10_000
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1_500

function getConfig() {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) throw new Error('[TMDB] TMDB_API_KEY environment variable is not set')
  return {
    apiKey,
    baseUrl: (process.env.TMDB_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ''),
    imageBase: (process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL || DEFAULT_IMAGE_BASE).replace(/\/$/, ''),
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    })
  } finally {
    clearTimeout(timer)
  }
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const { apiKey, baseUrl } = getConfig()
  const url = new URL(`${baseUrl}${path}`)
  url.searchParams.set('api_key', apiKey)
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v)
  }

  let lastError: Error | null = null
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url.toString())

      // TMDB rate limit: 429
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '2', 10)
        console.warn(`[TMDB] Rate limited. Waiting ${retryAfter}s...`)
        await new Promise(r => setTimeout(r, retryAfter * 1000))
        continue
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText} for ${path}`)
      }

      return (await res.json()) as T
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (lastError.message.includes('HTTP 4') && !lastError.message.includes('429')) throw lastError
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt))
      }
    }
  }
  throw lastError || new Error(`Failed to fetch TMDB ${path}`)
}

// ─── Public API ─────────────────────────────────────────────────

/** Search for movies */
export async function searchMovies(query: string, year?: number): Promise<TmdbSearchResponse<TmdbSearchMovieResult>> {
  const params: Record<string, string> = { query, language: 'vi-VN' }
  if (year) params.year = String(year)
  return tmdbFetch('/search/movie', params)
}

/** Search for TV shows */
export async function searchTv(query: string, year?: number): Promise<TmdbSearchResponse<TmdbSearchTvResult>> {
  const params: Record<string, string> = { query, language: 'vi-VN' }
  if (year) params.first_air_date_year = String(year)
  return tmdbFetch('/search/tv', params)
}

/** Get movie details */
export async function getMovieDetail(tmdbId: number): Promise<TmdbMovieDetail> {
  return tmdbFetch(`/movie/${tmdbId}`, { language: 'vi-VN' })
}

/** Get TV show details */
export async function getTvDetail(tmdbId: number): Promise<TmdbTvDetail> {
  return tmdbFetch(`/tv/${tmdbId}`, { language: 'vi-VN' })
}

/** Get external IDs (IMDB, TVDB, etc.) */
export async function getExternalIds(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<TmdbExternalIds> {
  return tmdbFetch(`/${mediaType}/${tmdbId}/external_ids`)
}

/** Get videos (trailers, teasers) */
export async function getVideos(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<TmdbVideosResponse> {
  return tmdbFetch(`/${mediaType}/${tmdbId}/videos`, { language: 'en-US' })
}

/** Get cast & crew credits */
export async function getCredits(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<TmdbCreditsResponse> {
  return tmdbFetch(`/${mediaType}/${tmdbId}/credits`, { language: 'vi-VN' })
}

/** Build full TMDB image URL */
export function buildImageUrl(path: string | null, size: string = 'original'): string | null {
  if (!path) return null
  const { imageBase } = getConfig()
  return `${imageBase}/${size}/${path.replace(/^\//, '')}`
}

/** Build full TMDB profile image URL */
export function buildProfileUrl(path: string | null): string | null {
  return buildImageUrl(path, 'w185')
}

/** Test TMDB connectivity */
export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await tmdbFetch('/configuration')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
