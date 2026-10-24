// Without TMDB credentials every request would be a guaranteed 401: the client
// must fail fast without touching the network (Render logs were flooded).

import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('tmdbFetch without credentials', () => {
  it('rejects with a 401 TmdbApiError and makes no HTTP request', async () => {
    vi.stubEnv('TMDB_API_KEY', '')
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { tmdbFetch, tmdbFetchSafe, TmdbApiError } = await import('@/src/be/modules/tmdb/legacy/client')

    await expect(tmdbFetch('/movie/popular')).rejects.toBeInstanceOf(TmdbApiError)
    await expect(tmdbFetchSafe('/trending/movie/week')).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still calls TMDB when a read access token is configured', async () => {
    vi.stubEnv('TMDB_API_KEY', '')
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', 'test-token-value')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"results":[]}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { tmdbFetch } = await import('@/src/be/modules/tmdb/legacy/client')

    await expect(tmdbFetch('/movie/popular')).resolves.toEqual({ results: [] })
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
