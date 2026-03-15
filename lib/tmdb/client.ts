// ============================================
// TMDB API HTTP Client — server-side fetch wrapper
// Features: timeout, error handling, safe logging
// ============================================

import { TMDB_CONFIG } from './config'

/** Default request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 10_000

interface FetchOptions {
  params?: Record<string, string | number | undefined>
  language?: string
  revalidate?: number | false
  /** Override timeout in ms (default: 10s) */
  timeout?: number
}

export class TmdbApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    public readonly statusText: string,
  ) {
    super(`[TMDB] ${status} ${statusText} — ${endpoint}`)
    this.name = 'TmdbApiError'
  }
}

export class TmdbTimeoutError extends Error {
  constructor(public readonly endpoint: string) {
    super(`[TMDB] Request timeout — ${endpoint}`)
    this.name = 'TmdbTimeoutError'
  }
}

export async function tmdbFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    params = {},
    language,
    revalidate = 3600,
    timeout = REQUEST_TIMEOUT_MS,
  } = options

  const url = new URL(`${TMDB_CONFIG.baseUrl}${endpoint}`)

  // Auth + language
  url.searchParams.set('language', language ?? TMDB_CONFIG.language)
  if (TMDB_CONFIG.apiKey) {
    url.searchParams.set('api_key', TMDB_CONFIG.apiKey)
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value))
  })

  const headers: HeadersInit = { Accept: 'application/json' }
  if (TMDB_CONFIG.accessToken) {
    headers.Authorization = `Bearer ${TMDB_CONFIG.accessToken}`
  }

  // AbortController for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url.toString(), {
      headers,
      signal: controller.signal,
      next: revalidate !== false ? { revalidate } : undefined,
    })

    if (!response.ok) {
      // Safe log: never log full URL (contains api_key)
      console.error(`[TMDB] HTTP ${response.status} — ${endpoint}`)
      throw new TmdbApiError(response.status, endpoint, response.statusText)
    }

    return response.json() as Promise<T>
  } catch (error) {
    if (error instanceof TmdbApiError) throw error

    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error(`[TMDB] Timeout after ${timeout}ms — ${endpoint}`)
      throw new TmdbTimeoutError(endpoint)
    }

    // Network or unknown error — safe log (no secrets)
    console.error(`[TMDB] Fetch failed — ${endpoint}:`, (error as Error).message)
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Same as tmdbFetch but returns null instead of throwing.
 * Useful for optional data where missing data should not crash the page.
 */
export async function tmdbFetchSafe<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T | null> {
  try {
    return await tmdbFetch<T>(endpoint, options)
  } catch {
    return null
  }
}
