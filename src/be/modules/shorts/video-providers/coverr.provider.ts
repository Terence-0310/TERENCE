// ============================================
// Coverr API adapter (https://api.coverr.co/docs/)
// ============================================
//   • Auth: `Authorization: Bearer <COVERR_API_KEY>` — server side only, the
//     key never reaches the browser (Coverr requires calls from a backend).
//   • GET /videos?page=&page_size=&sort=popular|date|trending&query=&urls=true
//     → { page, pages, page_size, total, hits: Video[] }   (page is zero-based)
//   • GET /videos/:id → Video (always includes `urls`)
//   • Demo apps are limited to 50 requests/hour, so callers cache responses
//     (see video-library.service) and back off on 429.
//   • Videos are streamed from Coverr's signed `urls.mp4`, never downloaded;
//     the `mp4_download` ping is only required for downloads, which we don't do.

import { logger } from '@/src/be/shared/utils/logger'
import {
  VideoProviderError,
  type LibraryVideo, type ProviderListParams, type ProviderListResult, type VideoProvider,
} from './types'

const log = logger.child({ module: 'shorts-coverr' })

const BASE_URL = 'https://api.coverr.co'
const TIMEOUT_MS = 8_000
const MAX_ATTEMPTS = 2

const SORT_PARAM: Record<ProviderListParams['sort'], string> = {
  popular: 'popular',
  trending: 'trending',
  latest: 'date',
}

interface CoverrVideo {
  id?: string
  title?: string
  description?: string | null
  poster?: string | null
  thumbnail?: string | null
  duration?: number | string | null
  max_width?: number | null
  max_height?: number | null
  is_vertical?: boolean
  tags?: unknown[]
  created_at?: string
  published_at?: string
  urls?: { mp4?: string; mp4_preview?: string; mp4_download?: string }
}

interface CoverrList {
  page?: number
  pages?: number
  hits?: CoverrVideo[]
}

function apiKey(): string {
  const key = process.env.COVERR_API_KEY?.trim() ?? ''
  // The documented placeholder counts as "not configured".
  return key === 'YOUR_API_KEY' ? '' : key
}

function toTag(t: unknown): string | null {
  if (typeof t === 'string') return t
  if (t && typeof t === 'object') {
    const o = t as Record<string, unknown>
    const v = o.name ?? o.title ?? o.slug
    if (typeof v === 'string') return v
  }
  return null
}

export function mapCoverrVideo(v: CoverrVideo): LibraryVideo | null {
  const videoUrl = v.urls?.mp4 || v.urls?.mp4_preview
  if (!v.id || !v.title || !videoUrl) return null
  const duration = Number(v.duration)
  return {
    id: `coverr:${v.id}`,
    title: v.title,
    description: v.description?.trim() || null,
    videoUrl,
    thumbnailUrl: v.poster || v.thumbnail || null,
    duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
    width: v.max_width ?? null,
    height: v.max_height ?? null,
    author: null, // not part of the documented video schema
    tags: (v.tags ?? []).map(toTag).filter((t): t is string => !!t).slice(0, 10),
    source: 'coverr',
    license: {
      name: 'Coverr License',
      url: 'https://coverr.co/license',
      attribution: 'Video từ Coverr',
      attributionUrl: 'https://coverr.co',
    },
    createdAt: v.published_at || v.created_at || new Date(0).toISOString(),
  }
}

async function request<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const key = apiKey()
  if (!key) throw new VideoProviderError('COVERR_API_KEY is not set', 'coverr', 'auth')
  const url = `${BASE_URL}${path}?${new URLSearchParams(params)}`

  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      })
      if (res.ok) return (await res.json()) as T
      // Log the path and status only — the URL carries no secret, but keep it terse.
      log.warn({ path, status: res.status, attempt }, 'Coverr request failed')
      if (res.status === 404) return null
      if (res.status === 401 || res.status === 403) {
        throw new VideoProviderError('Coverr rejected the API key', 'coverr', 'auth', res.status)
      }
      if (res.status === 429) {
        throw new VideoProviderError('Coverr rate limit reached', 'coverr', 'quota', res.status)
      }
      if (res.status < 500) {
        throw new VideoProviderError(`Coverr answered ${res.status}`, 'coverr', 'bad_response', res.status)
      }
      lastError = new VideoProviderError(`Coverr answered ${res.status}`, 'coverr', 'unavailable', res.status)
    } catch (err) {
      if (err instanceof VideoProviderError) throw err
      lastError = new VideoProviderError(
        err instanceof Error && err.name === 'TimeoutError' ? 'Coverr timed out' : 'Coverr unreachable',
        'coverr', 'unavailable',
      )
      log.warn({ path, attempt, err: err instanceof Error ? err.message : String(err) }, 'Coverr request error')
    }
    if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 400 * attempt))
  }
  throw lastError
}

export const coverrProvider: VideoProvider = {
  name: 'coverr',

  isConfigured: () => apiKey().length > 0,

  async list({ sort, query, page, pageSize }: ProviderListParams): Promise<ProviderListResult> {
    const params: Record<string, string> = {
      page: String(page),
      page_size: String(pageSize),
      sort: SORT_PARAM[sort],
      urls: 'true',
    }
    if (query?.trim()) params.query = query.trim()
    const data = await request<CoverrList>('/videos', params)
    if (!data || !Array.isArray(data.hits)) {
      throw new VideoProviderError('Unexpected Coverr list response', 'coverr', 'bad_response')
    }
    const items = data.hits.map(mapCoverrVideo).filter((v): v is LibraryVideo => !!v)
    const pages = typeof data.pages === 'number' ? data.pages : 0
    return { items, hasMore: page + 1 < pages }
  },

  async getById(providerId: string): Promise<LibraryVideo | null> {
    if (!/^[\w-]{1,64}$/.test(providerId)) return null
    const data = await request<CoverrVideo>(`/videos/${providerId}`)
    return data ? mapCoverrVideo(data) : null
  },
}
