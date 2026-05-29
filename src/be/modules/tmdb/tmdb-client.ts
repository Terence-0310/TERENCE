// ============================================
// TMDB HTTP Client — Typed API Layer
// ============================================
// Server-side only. Provides typed wrapper functions for TMDB v3 API.
//
// Sprint 2: Base HTTP layer consolidated. All HTTP requests now delegate
// to the canonical tmdbFetch from lib/tmdb/client.ts, eliminating the
// duplicate fetch-with-retry implementation that previously existed here.
//
// This file provides typed domain methods (searchMovies, searchTv, etc.)
// that compose on top of the canonical base client. It also adds
// rate-limit (429) retry handling specific to sync/enrichment operations.
//
// Canonical base client: lib/tmdb/client.ts

import { tmdbFetch as canonicalFetch, TmdbApiError } from '@/src/be/modules/tmdb/legacy/client'
import { logger } from '@/src/be/shared/utils/logger'
import type {
  TmdbSearchResponse, TmdbSearchMovieResult, TmdbSearchTvResult,
  TmdbExternalIds, TmdbVideosResponse, TmdbCreditsResponse,
  TmdbMovieDetail, TmdbTvDetail,
} from './types'

const log = logger.child({ module: 'tmdb-client' })

const DEFAULT_IMAGE_BASE = 'https://image.tmdb.org/t/p'
const MAX_RATE_LIMIT_RETRIES = 3

// ─── Internal: HTTP layer delegating to canonical client ────────
// Uses revalidate: 0 (no caching) since this module is used for
// sync/enrichment operations that need fresh data.
// Adds 429 rate-limit retry handling on top of canonical's retry logic.

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  for (let attempt = 0; attempt < MAX_RATE_LIMIT_RETRIES; attempt++) {
    try {
      return await canonicalFetch<T>(path, {
        params: params as Record<string, string | number | undefined>,
        revalidate: 0,
      })
    } catch (error) {
      // Handle TMDB rate limiting (429) with backoff retry
      if (
        error instanceof TmdbApiError &&
        error.status === 429 &&
        attempt < MAX_RATE_LIMIT_RETRIES - 1
      ) {
        const waitMs = 2000 * (attempt + 1)
        log.warn({ path, waitMs, attempt: attempt + 1 }, `Rate limited on ${path}. Retrying in ${waitMs / 1000}s... (attempt ${attempt + 1})`)
        await new Promise(r => setTimeout(r, waitMs))
        continue
      }
      throw error
    }
  }

  throw new Error(`[TMDB] Rate limit exceeded after ${MAX_RATE_LIMIT_RETRIES} retries for ${path}`)
}

// ─── Image URL Helpers ──────────────────────────────────────────

function getImageBase(): string {
  return (process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL || DEFAULT_IMAGE_BASE).replace(/\/$/, '')
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
  const base = getImageBase()
  return `${base}/${size}/${path.replace(/^\//, '')}`
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
