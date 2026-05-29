// ============================================
// TMDB API HTTP Client — server-side fetch wrapper
// Features: timeout, error handling, safe logging
// ============================================

import { TMDB_CONFIG } from './config'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'tmdb-legacy-client' })

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

  if (endpoint.includes('NaN') || endpoint.includes('undefined') || endpoint.includes('null')) {
    log.error({ endpoint }, `Blocked invalid endpoint fetch: ${endpoint}`)
    throw new Error(`[TMDB] Invalid endpoint: ${endpoint}`)
  }

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

  // Retry configuration
  const MAX_RETRIES = 2
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
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
        log.error({ status: response.status, endpoint }, `HTTP ${response.status} — ${endpoint}`)
        
        // Don't retry 4xx client errors (not-found, unauthorized, etc.)
        if (response.status >= 400 && response.status < 500) {
          throw new TmdbApiError(response.status, endpoint, response.statusText)
        }
        
        // Retry 5xx server errors
        lastError = new TmdbApiError(response.status, endpoint, response.statusText)
        if (attempt < MAX_RETRIES) {
          await sleep(300 * (attempt + 1)) // 300ms, 600ms backoff
          continue
        }
        throw lastError
      }

      return response.json() as Promise<T>
    } catch (error) {
      if (error instanceof TmdbApiError) throw error

      if (error instanceof DOMException && error.name === 'AbortError') {
        log.error({ timeout, endpoint, attempt: attempt + 1 }, `Timeout after ${timeout}ms — ${endpoint} (attempt ${attempt + 1})`)
        lastError = new TmdbTimeoutError(endpoint)
        if (attempt < MAX_RETRIES) {
          await sleep(300 * (attempt + 1))
          continue
        }
        throw lastError
      }

      // Network or unknown error — safe log (no secrets)
      log.error({ endpoint, err: (error as Error).message, attempt: attempt + 1 }, `Fetch failed — ${endpoint}: ${(error as Error).message} (attempt ${attempt + 1})`)
      lastError = error
      if (attempt < MAX_RETRIES) {
        await sleep(300 * (attempt + 1))
        continue
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw lastError
}

/** Simple async sleep helper */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
