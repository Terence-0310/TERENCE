// ============================================
// TMDB API Configuration — reads from centralized env
// ============================================

import { ENV } from '@/lib/env'

export const TMDB_CONFIG = {
  baseUrl: ENV.tmdb.baseUrl,
  apiKey: ENV.tmdb.apiKey,
  accessToken: ENV.tmdb.readAccessToken,
  imageBaseUrl: ENV.tmdb.imageBaseUrl,
  language: ENV.tmdb.language,
  fallbackLanguage: 'en-US',
  region: ENV.tmdb.region,
} as const

// Image helpers
export type PosterSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original'
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original'
export type ProfileSize = 'w45' | 'w185' | 'h632' | 'original'

export function tmdbImageUrl(path: string | null | undefined, size: PosterSize | BackdropSize | ProfileSize = 'w500'): string {
  if (!path) return '/placeholder.jpg'
  return `${TMDB_CONFIG.imageBaseUrl}/${size}${path}`
}

export function tmdbPosterUrl(path: string | null | undefined): string {
  return tmdbImageUrl(path, 'w500')
}

export function tmdbBackdropUrl(path: string | null | undefined): string {
  return tmdbImageUrl(path, 'w1280')
}

export function tmdbProfileUrl(path: string | null | undefined): string {
  return tmdbImageUrl(path, 'w185')
}
