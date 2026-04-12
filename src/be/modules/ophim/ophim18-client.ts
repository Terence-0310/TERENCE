// ============================================
// OPhim18 HTTP Client
// ============================================
// Server-side only. Uses the OPhim v1/api endpoints.
// OPhim18.cc is the frontend; ophim1.com hosts the API backend.
// Endpoints according to https://ophim18.cc/api-document:
//   - GET /v1/api/home                     → home page data
//   - GET /v1/api/danh-sach/{type}?page=N  → catalog listing
//   - GET /v1/api/phim/{slug}              → movie detail + episodes
//   - GET /v1/api/the-loai                 → categories list
//   - GET /v1/api/quoc-gia                 → countries list
//   - GET /v1/api/tim-kiem?keyword=X       → search

import type {
  OPhim18DetailResponse,
  OPhim18CatalogResponse,
  OPhim18SearchResponse,
} from './ophim18-types'

const DEFAULT_BASE_URL = 'https://ophim1.com'
const DEFAULT_TIMEOUT = 20_000
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1_000

function getConfig() {
  return {
    baseUrl: (process.env.OPHIM18_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ''),
    timeout: Number(process.env.OPHIM18_TIMEOUT) || DEFAULT_TIMEOUT,
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
        'User-Agent': 'TERENCE-Sync/2.0',
      },
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

      // Don't retry on 404 or 400-level errors (except rate limits)
      if (lastError.message.includes('HTTP 4') && !lastError.message.includes('HTTP 429')) {
        throw lastError
      }

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt
        console.warn(`[OPhim18] Attempt ${attempt}/${MAX_RETRIES} failed for ${url}. Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${MAX_RETRIES} attempts`)
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Fetch movie detail + episodes by slug.
 * Endpoint: GET /v1/api/phim/{slug}
 */
export async function fetchMovieDetail(slug: string): Promise<OPhim18DetailResponse> {
  const { baseUrl, timeout } = getConfig()
  const url = `${baseUrl}/v1/api/phim/${encodeURIComponent(slug)}`

  console.log(`[OPhim18] Fetching movie detail: ${slug}`)
  const data = await fetchWithRetry<OPhim18DetailResponse>(url, timeout)

  if (data.status !== 'success' && data.status !== true) {
    throw new Error(`[OPhim18] Movie not found or invalid response for slug: ${slug}`)
  }

  if (!data.data?.item) {
    throw new Error(`[OPhim18] No item data in response for slug: ${slug}`)
  }

  return data
}

/**
 * Fetch catalog listing (recently updated movies).
 * Endpoint: GET /v1/api/danh-sach/{type}?page=N
 * @param type Catalog type slug (e.g. "phim-moi-cap-nhat", "phim-bo", "phim-le")
 * @param page Page number (1-indexed)
 */
export async function fetchCatalogPage(
  type: string = 'phim-moi-cap-nhat',
  page: number = 1
): Promise<OPhim18CatalogResponse> {
  const { baseUrl, timeout } = getConfig()
  const url = `${baseUrl}/v1/api/danh-sach/${encodeURIComponent(type)}?page=${page}`

  console.log(`[OPhim18] Fetching catalog "${type}" page ${page}...`)
  const data = await fetchWithRetry<OPhim18CatalogResponse>(url, timeout)

  if (data.status !== 'success' && data.status !== true) {
    throw new Error(`[OPhim18] Invalid catalog response for ${type} page ${page}`)
  }

  const items = data.data?.items || []
  const pagination = data.data?.params?.pagination || { totalItems: 0, totalItemsPerPage: 24, currentPage: page, totalPages: 1 }

  console.log(`[OPhim18] Got ${items.length} items (page ${pagination.currentPage}/${pagination.totalPages})`)
  return data
}

/**
 * Search movies by keyword.
 * Endpoint: GET /v1/api/tim-kiem?keyword=X&page=N
 */
export async function searchMovies(keyword: string, page: number = 1): Promise<OPhim18SearchResponse> {
  const { baseUrl, timeout } = getConfig()
  const url = `${baseUrl}/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`

  console.log(`[OPhim18] Searching: "${keyword}" page ${page}`)
  const data = await fetchWithRetry<OPhim18SearchResponse>(url, timeout)

  return data
}

/**
 * Fetch total number of pages available in the catalog.
 */
export async function fetchTotalPages(type: string = 'phim-moi-cap-nhat'): Promise<number> {
  const data = await fetchCatalogPage(type, 1)
  return data.data?.params?.pagination?.totalPages || 1
}

/**
 * Test connectivity to OPhim18 API.
 */
export async function testConnection(): Promise<{ ok: boolean; totalMovies?: number; error?: string }> {
  try {
    const data = await fetchCatalogPage('phim-moi-cap-nhat', 1)
    return {
      ok: true,
      totalMovies: data.data?.params?.pagination?.totalItems || 0,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
