// ============================================
// Shorts — external video library (Khám phá)
// ============================================
// Frontend → /api/v1/shorts/search|trending → this service → VideoProvider
// (Coverr when COVERR_API_KEY is set, otherwise the mock provider).
//
//   • Responses are cached (Redis, or memory without REDIS_URL) for 30 min,
//     with a 24 h stale copy served when the provider fails — Coverr's demo
//     tier allows only 50 requests/hour.
//   • Identical concurrent requests share one upstream call.
//   • Auth / quota errors put the provider on a cooldown instead of retrying
//     on every request; meanwhile stale data, then the mock provider, is served.

import { redis } from '@/src/lib/redis'
import { logger } from '@/src/be/shared/utils/logger'
import { coverrProvider } from './video-providers/coverr.provider'
import { mockProvider } from './video-providers/mock.provider'
import {
  VideoProviderError,
  type LibraryProviderName, type LibrarySort, type LibraryVideo, type VideoProvider,
} from './video-providers/types'

const log = logger.child({ module: 'shorts-library' })

const PROVIDERS: Record<LibraryProviderName, VideoProvider> = { coverr: coverrProvider, mock: mockProvider }

const FRESH_TTL_S = 30 * 60
const STALE_TTL_S = 24 * 60 * 60
const DETAIL_TTL_S = 60 * 60
const COOLDOWN_MS: Record<VideoProviderError['kind'], number> = {
  auth: 60 * 60_000,
  quota: 15 * 60_000,
  unavailable: 2 * 60_000,
  bad_response: 5 * 60_000,
}

/** Topic chips. `query` is what providers are searched with (Coverr is English-first). */
export const LIBRARY_TOPICS = [
  { id: 'nature', label: 'Thiên nhiên', query: 'nature' },
  { id: 'city', label: 'Thành phố', query: 'city' },
  { id: 'ocean', label: 'Biển', query: 'ocean' },
  { id: 'animals', label: 'Động vật', query: 'animals' },
  { id: 'sky', label: 'Bầu trời', query: 'sky' },
  { id: 'food', label: 'Ẩm thực', query: 'food' },
  { id: 'people', label: 'Con người', query: 'people' },
] as const

export type LibraryTopic = (typeof LIBRARY_TOPICS)[number]['id']

export interface LibraryStatus {
  /** Provider that served this response. */
  provider: LibraryProviderName
  /** live = fresh upstream call, cache = cached copy, stale = expired copy after an upstream error, fallback = mock after an upstream error. */
  mode: 'live' | 'cache' | 'stale' | 'fallback'
  /** Whether a real provider (Coverr) is configured at all. */
  configured: boolean
}

export interface LibraryPage {
  items: LibraryVideo[]
  nextCursor: string | null
  status: LibraryStatus
}

// ─── Small cache with a memory fallback ─────────────────────────

const memory = new Map<string, { value: string; expires: number }>()
const MEMORY_MAX = 300

async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    if (redis) {
      const raw = await redis.get(key)
      return raw ? (JSON.parse(raw) as T) : null
    }
  } catch {
    // Redis down → behave like a miss.
  }
  const hit = memory.get(key)
  if (!hit) return null
  if (hit.expires < Date.now()) {
    memory.delete(key)
    return null
  }
  return JSON.parse(hit.value) as T
}

async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const raw = JSON.stringify(value)
  try {
    if (redis) {
      await redis.setex(key, ttlSeconds, raw)
      return
    }
  } catch {
    // fall through to memory
  }
  if (memory.size >= MEMORY_MAX) memory.delete(memory.keys().next().value!)
  memory.set(key, { value: raw, expires: Date.now() + ttlSeconds * 1000 })
}

// ─── Provider selection, cooldown, de-duplication ───────────────

const cooldownUntil = new Map<LibraryProviderName, number>()
const inflight = new Map<string, Promise<unknown>>()

function primaryProvider(): VideoProvider {
  return coverrProvider.isConfigured() ? coverrProvider : mockProvider
}

function mockFallbackEnabled(): boolean {
  return process.env.SHORTS_LIBRARY_MOCK_FALLBACK !== 'false'
}

function coolingDown(p: VideoProvider): boolean {
  return (cooldownUntil.get(p.name) ?? 0) > Date.now()
}

function noteFailure(p: VideoProvider, err: unknown) {
  const kind = err instanceof VideoProviderError ? err.kind : 'unavailable'
  cooldownUntil.set(p.name, Date.now() + COOLDOWN_MS[kind])
  log.warn({ provider: p.name, kind, err: err instanceof Error ? err.message : String(err) }, 'Library provider failed — cooling down')
}

function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const pending = inflight.get(key) as Promise<T> | undefined
  if (pending) return pending
  const p = run().finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

// ─── Public API ─────────────────────────────────────────────────

export interface LibraryListOptions {
  sort?: LibrarySort
  query?: string
  topic?: string
  /** Opaque cursor from a previous response (zero-based page). */
  cursor?: string | null
  limit?: number
}

function parseCursor(cursor: string | null | undefined): number {
  const n = Number.parseInt(cursor ?? '', 10)
  return Number.isFinite(n) && n >= 0 && n < 1000 ? n : 0
}

export async function listLibrary(opts: LibraryListOptions = {}): Promise<LibraryPage> {
  const sort = opts.sort ?? 'popular'
  const pageSize = Math.min(Math.max(opts.limit ?? 10, 1), 24)
  const page = parseCursor(opts.cursor)
  const topic = LIBRARY_TOPICS.find((t) => t.id === opts.topic)
  const query = [opts.query?.trim(), topic?.query].filter(Boolean).join(' ').slice(0, 100)

  const primary = primaryProvider()
  const configured = coverrProvider.isConfigured()
  const key = `shorts:lib:v1:${primary.name}:${sort}:${encodeURIComponent(query.toLowerCase())}:${page}:${pageSize}`

  type Cached = { items: LibraryVideo[]; hasMore: boolean }
  const toPage = (data: Cached, provider: LibraryProviderName, mode: LibraryStatus['mode'], p = page): LibraryPage => ({
    items: data.items,
    nextCursor: data.hasMore ? String(p + 1) : null,
    status: { provider, mode, configured },
  })

  const fresh = await cacheGet<Cached>(key)
  if (fresh) return toPage(fresh, primary.name, 'cache')

  if (!coolingDown(primary)) {
    try {
      const data = await dedupe(key, () => primary.list({ sort, query, page, pageSize }))
      await Promise.all([cacheSet(key, data, FRESH_TTL_S), cacheSet(`${key}:stale`, data, STALE_TTL_S)])
      return toPage(data, primary.name, 'live')
    } catch (err) {
      noteFailure(primary, err)
    }
  }

  const stale = await cacheGet<Cached>(`${key}:stale`)
  if (stale) return toPage(stale, primary.name, 'stale')

  if (primary !== mockProvider && mockFallbackEnabled()) {
    const data = await mockProvider.list({ sort, query, page, pageSize })
    return toPage(data, 'mock', 'fallback')
  }
  throw new VideoProviderError('Video library is temporarily unavailable', primary.name, 'unavailable')
}

/** True for ids served by this library ("coverr:…", "mock:…") rather than the Short table. */
export function isLibraryId(id: string): boolean {
  return /^(coverr|mock):[\w-]{1,64}$/.test(id)
}

export async function getLibraryVideo(id: string): Promise<LibraryVideo | null> {
  if (!isLibraryId(id)) return null
  const [name, providerId] = id.split(':') as [LibraryProviderName, string]
  const provider = PROVIDERS[name]
  if (!provider.isConfigured() || coolingDown(provider)) return null

  const key = `shorts:lib:v1:video:${id}`
  const cached = await cacheGet<LibraryVideo>(key)
  if (cached) return cached
  try {
    const video = await dedupe(key, () => provider.getById(providerId))
    if (video) await cacheSet(key, video, DETAIL_TTL_S)
    return video
  } catch (err) {
    noteFailure(provider, err)
    return null
  }
}

/** For tests: forget cooldowns and the memory cache. */
export function __resetLibraryState() {
  cooldownUntil.clear()
  inflight.clear()
  memory.clear()
}
