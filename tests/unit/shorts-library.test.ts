// Shorts "Khám phá" library: Coverr adapter mapping / error handling, and the
// service's provider fallback, caching, cooldown and request de-duplication.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Memory cache only — never touch a real Redis from unit tests.
vi.mock('@/src/lib/redis', () => ({ redis: null }))

import { coverrProvider, mapCoverrVideo } from '@/src/be/modules/shorts/video-providers/coverr.provider'
import { mockProvider } from '@/src/be/modules/shorts/video-providers/mock.provider'
import { VideoProviderError } from '@/src/be/modules/shorts/video-providers/types'
import {
  listLibrary, getLibraryVideo, isLibraryId, __resetLibraryState,
} from '@/src/be/modules/shorts/video-library.service'

const coverrHit = {
  id: 'abc123',
  title: 'Waves at dusk',
  description: 'Slow waves',
  poster: 'https://cdn.coverr.co/poster.jpg',
  thumbnail: 'https://cdn.coverr.co/thumb.jpg',
  duration: 12.6,
  max_width: 1080,
  max_height: 1920,
  is_vertical: true,
  tags: ['ocean', { name: 'sunset' }],
  published_at: '2026-01-02T00:00:00Z',
  urls: { mp4: 'https://cdn.coverr.co/v.mp4', mp4_preview: 'https://cdn.coverr.co/p.mp4', mp4_download: 'https://cdn.coverr.co/d.mp4' },
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  __resetLibraryState()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('mapCoverrVideo', () => {
  it('normalises a Coverr video', () => {
    const v = mapCoverrVideo(coverrHit)!
    expect(v).toMatchObject({
      id: 'coverr:abc123',
      title: 'Waves at dusk',
      videoUrl: 'https://cdn.coverr.co/v.mp4',
      thumbnailUrl: 'https://cdn.coverr.co/poster.jpg',
      duration: 13,
      width: 1080,
      height: 1920,
      tags: ['ocean', 'sunset'],
      source: 'coverr',
      createdAt: '2026-01-02T00:00:00Z',
    })
    expect(v.license.attribution).toBeTruthy()
  })

  it('drops videos without a playable URL', () => {
    expect(mapCoverrVideo({ ...coverrHit, urls: undefined })).toBeNull()
  })
})

describe('coverrProvider', () => {
  it('is not configured without COVERR_API_KEY', () => {
    vi.stubEnv('COVERR_API_KEY', '')
    expect(coverrProvider.isConfigured()).toBe(false)
  })

  it('sends the key as a Bearer header (not in the URL) and maps paging', async () => {
    vi.stubEnv('COVERR_API_KEY', 'test-coverr-key')
    const fetchMock = vi.fn().mockResolvedValue(json({ page: 0, pages: 3, page_size: 2, total: 6, hits: [coverrHit] }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await coverrProvider.list({ sort: 'latest', query: 'ocean', page: 0, pageSize: 2 })
    expect(res.hasMore).toBe(true)
    expect(res.items).toHaveLength(1)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('https://api.coverr.co/videos?')
    expect(url).toContain('sort=date')
    expect(url).toContain('query=ocean')
    expect(url).toContain('urls=true')
    expect(url).not.toContain('test-coverr-key')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-coverr-key')
  })

  it('maps 429 to a quota error without retrying', async () => {
    vi.stubEnv('COVERR_API_KEY', 'test-coverr-key')
    const fetchMock = vi.fn().mockResolvedValue(json({}, 429))
    vi.stubGlobal('fetch', fetchMock)
    await expect(coverrProvider.list({ sort: 'popular', page: 0, pageSize: 10 }))
      .rejects.toMatchObject({ kind: 'quota' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('maps 401 to an auth error', async () => {
    vi.stubEnv('COVERR_API_KEY', 'test-coverr-key')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 401)))
    await expect(coverrProvider.list({ sort: 'popular', page: 0, pageSize: 10 }))
      .rejects.toMatchObject({ kind: 'auth' })
  })

  it('retries a 5xx once, then reports the provider unavailable', async () => {
    vi.stubEnv('COVERR_API_KEY', 'test-coverr-key')
    const fetchMock = vi.fn().mockResolvedValue(json({}, 503))
    vi.stubGlobal('fetch', fetchMock)
    await expect(coverrProvider.list({ sort: 'popular', page: 0, pageSize: 10 }))
      .rejects.toBeInstanceOf(VideoProviderError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns null for an unknown video', async () => {
    vi.stubEnv('COVERR_API_KEY', 'test-coverr-key')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 404)))
    await expect(coverrProvider.getById('nope')).resolves.toBeNull()
  })
})

describe('mockProvider', () => {
  it('searches without diacritics and pages', async () => {
    const res = await mockProvider.list({ sort: 'popular', query: 'meo', page: 0, pageSize: 10 })
    expect(res.items.map((v) => v.id)).toContain('mock:cat-kitten')
    const page0 = await mockProvider.list({ sort: 'popular', page: 0, pageSize: 4 })
    const page1 = await mockProvider.list({ sort: 'popular', page: 1, pageSize: 4 })
    expect(page0.hasMore).toBe(true)
    expect(page1.items[0].id).not.toBe(page0.items[0].id)
  })
})

describe('listLibrary', () => {
  it('uses the mock provider when Coverr has no key', async () => {
    vi.stubEnv('COVERR_API_KEY', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const page = await listLibrary({ sort: 'trending', limit: 5 })
    expect(page.status).toEqual({ provider: 'mock', mode: 'live', configured: false })
    expect(page.items).toHaveLength(5)
    expect(page.nextCursor).toBe('1')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('filters by topic', async () => {
    vi.stubEnv('COVERR_API_KEY', '')
    const page = await listLibrary({ topic: 'animals', limit: 10 })
    expect(page.items.length).toBeGreaterThan(0)
    expect(page.items.every((v) => v.tags.includes('animals'))).toBe(true)
  })

  it('serves Coverr and caches the page', async () => {
    vi.stubEnv('COVERR_API_KEY', 'test-coverr-key')
    const fetchMock = vi.fn().mockResolvedValue(json({ page: 0, pages: 1, hits: [coverrHit] }))
    vi.stubGlobal('fetch', fetchMock)

    const first = await listLibrary({ sort: 'popular' })
    const second = await listLibrary({ sort: 'popular' })
    expect(first.status.mode).toBe('live')
    expect(second.status.mode).toBe('cache')
    expect(second.items[0].id).toBe('coverr:abc123')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shares one upstream call between concurrent identical requests', async () => {
    vi.stubEnv('COVERR_API_KEY', 'test-coverr-key')
    const fetchMock = vi.fn().mockImplementation(async () => json({ page: 0, pages: 1, hits: [coverrHit] }))
    vi.stubGlobal('fetch', fetchMock)
    await Promise.all([listLibrary({ query: 'x' }), listLibrary({ query: 'x' }), listLibrary({ query: 'x' })])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to mock videos on quota errors and stops calling Coverr during the cooldown', async () => {
    vi.stubEnv('COVERR_API_KEY', 'test-coverr-key')
    const fetchMock = vi.fn().mockResolvedValue(json({}, 429))
    vi.stubGlobal('fetch', fetchMock)

    const first = await listLibrary({ sort: 'trending', query: 'a' })
    expect(first.status).toEqual({ provider: 'mock', mode: 'fallback', configured: true })
    await listLibrary({ sort: 'trending', query: 'b' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reports unavailable when the mock fallback is disabled', async () => {
    vi.stubEnv('COVERR_API_KEY', 'test-coverr-key')
    vi.stubEnv('SHORTS_LIBRARY_MOCK_FALLBACK', 'false')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 401)))
    await expect(listLibrary({})).rejects.toBeInstanceOf(VideoProviderError)
  })
})

describe('library ids', () => {
  it('recognises library ids but not Short cuids', () => {
    expect(isLibraryId('coverr:abc123')).toBe(true)
    expect(isLibraryId('mock:cat-kitten')).toBe(true)
    expect(isLibraryId('clx9z0abc0000qwer1234')).toBe(false)
    expect(isLibraryId('coverr:../etc')).toBe(false)
  })

  it('resolves a mock video by id', async () => {
    vi.stubEnv('COVERR_API_KEY', '')
    await expect(getLibraryVideo('mock:cat-kitten')).resolves.toMatchObject({ id: 'mock:cat-kitten', source: 'mock' })
    await expect(getLibraryVideo('coverr:abc123')).resolves.toBeNull() // Coverr not configured
  })
})
