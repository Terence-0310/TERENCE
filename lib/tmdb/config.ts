// ============================================
// TMDB API Configuration — reads from centralized env
// ============================================

import { ENV } from '@/lib/env'
import { tmdbImage } from '@/lib/tmdb-image'

export const TMDB_CONFIG = {
  baseUrl: ENV.tmdb.baseUrl,
  apiKey: ENV.tmdb.apiKey,
  accessToken: ENV.tmdb.readAccessToken,
  language: ENV.tmdb.language,
  fallbackLanguage: 'en-US',
  region: ENV.tmdb.region,
} as const

// ── Re-export the canonical image helper ──
export { tmdbImage } from '@/lib/tmdb-image'

/** @deprecated Use tmdbImage — kept for backward compat */
export const getTmdbImageUrl = tmdbImage

/** @deprecated Use tmdbImage — kept for backward compat */
export const tmdbImageUrl = tmdbImage

// ── Convenience wrappers (all delegate to tmdbImage) ──

export function tmdbPosterUrl(path: string | null | undefined): string {
  return tmdbImage(path, 'w500')
}

export function tmdbBackdropUrl(path: string | null | undefined): string {
  return tmdbImage(path, 'w1280')
}

export function tmdbProfileUrl(path: string | null | undefined): string {
  return tmdbImage(path, 'w185')
}

