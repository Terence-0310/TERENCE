import { describe, it, expect, vi, beforeEach } from 'vitest'

const getVideosMultiLanguage = vi.fn()
vi.mock('@/src/be/modules/tmdb/tmdb-client', () => ({ getVideosMultiLanguage: (...a: unknown[]) => getVideosMultiLanguage(...a) }))

import {
  parseYouTubeId, buildHashtags, catalogTrailerShort, fetchTmdbShorts, type ProviderMovie,
} from '@/src/be/modules/shorts/shorts.providers'

const movie: ProviderMovie = {
  id: 'm1', title: 'Hoa Máu', originalTitle: 'Bloody Flower', year: 2026, tmdbId: 123,
  contentType: 'series', genres: ['Kinh Dị', 'Tâm Lý'],
}

describe('parseYouTubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?t=10', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('extracts the id from %s', (input, id) => {
    expect(parseYouTubeId(input)).toBe(id)
  })

  it('rejects non-YouTube input', () => {
    expect(parseYouTubeId('https://vimeo.com/123')).toBeNull()
    expect(parseYouTubeId('hello')).toBeNull()
  })
})

describe('buildHashtags', () => {
  it('strips Vietnamese diacritics and de-duplicates', () => {
    expect(buildHashtags(movie)).toBe('hoamau kinhdi tamly phimbo terence')
  })
})

describe('catalogTrailerShort', () => {
  it('builds a landscape short from the stored trailer key', () => {
    const [c] = catalogTrailerShort({ ...movie, trailerKey: 'dQw4w9WgXcQ', trailerSite: 'YouTube' })
    expect(c).toMatchObject({ externalId: 'yt:dQw4w9WgXcQ', source: 'catalog', orientation: 'landscape', videoUrl: 'dQw4w9WgXcQ' })
  })

  it('ignores missing or non-YouTube trailers', () => {
    expect(catalogTrailerShort(movie)).toEqual([])
    expect(catalogTrailerShort({ ...movie, trailerKey: 'abc', trailerSite: 'Vimeo' })).toEqual([])
  })
})

describe('fetchTmdbShorts', () => {
  beforeEach(() => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', 'token')
    getVideosMultiLanguage.mockReset()
  })

  it('prefers Vietnamese, then clips/teasers over trailers, YouTube only', async () => {
    getVideosMultiLanguage.mockResolvedValue({
      id: 123,
      results: [
        { key: 'trailerEN01', site: 'YouTube', type: 'Trailer', iso_639_1: 'en', official: true, name: 'Trailer', published_at: '2026-01-01' },
        { key: 'clipEN00001', site: 'YouTube', type: 'Clip', iso_639_1: 'en', official: true, name: 'Clip', published_at: '2026-01-01' },
        { key: 'trailerVI01', site: 'YouTube', type: 'Trailer', iso_639_1: 'vi', official: false, name: 'Trailer VN', published_at: '2026-01-01' },
        { key: 'vimeo000001', site: 'Vimeo', type: 'Clip', iso_639_1: 'en', official: true, name: 'Vimeo', published_at: '2026-01-01' },
      ],
    })
    const out = await fetchTmdbShorts(movie, 3)
    expect(out.map((c) => c.videoUrl)).toEqual(['trailerVI01', 'clipEN00001', 'trailerEN01'])
    expect(getVideosMultiLanguage).toHaveBeenCalledWith(123, 'tv')
  })

  it('returns [] when the movie has no TMDB id or the API fails', async () => {
    expect(await fetchTmdbShorts({ ...movie, tmdbId: null })).toEqual([])
    getVideosMultiLanguage.mockRejectedValue(new Error('boom'))
    expect(await fetchTmdbShorts(movie)).toEqual([])
  })
})
