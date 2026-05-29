// ============================================
// OPhim HTTP Client
// ============================================
// Server-side only. Handles API calls with timeout, retry, and error handling.

import type { OPhimCatalogResponse, OPhimDetailResponse } from './types'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'ophim-client' })

const DEFAULT_BASE_URL = 'https://ophim1.com'
const DEFAULT_TIMEOUT = 15_000  // 15 seconds
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1_000

function getConfig() {
  return {
    baseUrl: (process.env.OPHIM_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ''),
    timeout: Number(process.env.OPHIM_TIMEOUT) || DEFAULT_TIMEOUT,
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TERENCE-Sync/1.0',
      },
      // Never cache sync requests
      cache: 'no-store',
    })
    return response
  } finally {
    clearTimeout(timer)
  }
}

async function fetchWithRetry<T>(url: string, timeoutMs: number): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, timeoutMs)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`)
      }

      const data = await response.json()
      return data as T
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on 404 or 400-level errors
      if (lastError.message.includes('HTTP 4')) {
        throw lastError
      }

      // Don't retry on last attempt
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt
        log.warn({ attempt, maxRetries: MAX_RETRIES, url, delay }, `Attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${MAX_RETRIES} attempts`)
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Fetch a page of recently updated movies from OPhim catalog.
 * @param page Page number (1-indexed)
 */
export async function fetchCatalogPage(page: number = 1): Promise<OPhimCatalogResponse> {
  const { baseUrl, timeout } = getConfig()
  const url = `${baseUrl}/danh-sach/phim-moi-cap-nhat?page=${page}`

  log.info({ page }, 'Fetching catalog page')
  const data = await fetchWithRetry<OPhimCatalogResponse>(url, timeout)

  if (!data.status || !Array.isArray(data.items)) {
    throw new Error(`[OPhim] Invalid catalog response for page ${page}`)
  }

  log.info({ count: data.items.length, page, totalPages: data.pagination.totalPages }, `Got ${data.items.length} items`)
  return data
}

/**
 * Fetch detailed movie info + episodes by slug.
 * @param slug Movie slug (e.g. "cong-thuc-tinh-yeu")
 */
export async function fetchMovieDetail(slug: string): Promise<OPhimDetailResponse> {
  const { baseUrl, timeout } = getConfig()
  const url = `${baseUrl}/phim/${encodeURIComponent(slug)}`

  log.info({ slug }, 'Fetching movie detail')
  const data = await fetchWithRetry<OPhimDetailResponse>(url, timeout)

  if (!data.status || !data.movie) {
    throw new Error(`[OPhim] Movie not found or invalid response for slug: ${slug}`)
  }

  return data
}

/**
 * Fetch total number of pages available in the catalog.
 */
export async function fetchTotalPages(): Promise<number> {
  const data = await fetchCatalogPage(1)
  return data.pagination.totalPages
}

/**
 * Test connectivity to OPhim API.
 */
export async function testConnection(): Promise<{ ok: boolean; totalMovies: number; error?: string }> {
  try {
    const data = await fetchCatalogPage(1)
    return { ok: true, totalMovies: data.pagination.totalItems }
  } catch (error) {
    return {
      ok: false,
      totalMovies: 0,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
