// ============================================
// Unit Tests — TMDB Image Helper & Mapper
// ============================================

import { describe, it, expect } from 'vitest'
import { tmdbImage } from '@/lib/tmdb-image'
import { mapMovie, mapMovieDetail, mapGenre } from '@/lib/tmdb/mapper'
import { fixtures } from '@/tests/fixtures'

describe('tmdbImage()', () => {
  it('should build full URL for valid path', () => {
    expect(tmdbImage('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w500/abc.jpg')
  })

  it('should respect custom size', () => {
    expect(tmdbImage('/abc.jpg', 'w780')).toBe('https://image.tmdb.org/t/p/w780/abc.jpg')
    expect(tmdbImage('/abc.jpg', 'w1280')).toBe('https://image.tmdb.org/t/p/w1280/abc.jpg')
    expect(tmdbImage('/abc.jpg', 'original')).toBe('https://image.tmdb.org/t/p/original/abc.jpg')
  })

  it('should return placeholder for null', () => {
    expect(tmdbImage(null)).toBe('/placeholder.jpg')
  })

  it('should return placeholder for undefined', () => {
    expect(tmdbImage(undefined)).toBe('/placeholder.jpg')
  })

  it('should return placeholder for empty string', () => {
    expect(tmdbImage('')).toBe('/placeholder.jpg')
  })

  it('should default to w500 size', () => {
    expect(tmdbImage('/test.jpg')).toBe('https://image.tmdb.org/t/p/w500/test.jpg')
  })
})

describe('TMDB Mapper', () => {
  describe('mapMovie()', () => {
    it('should map raw TMDB movie to app model', () => {
      const raw = fixtures.tmdbMovie.raw
      const result = mapMovie(raw as any)

      expect(result.id).toBe(299534)
      expect(result.title).toBe('Avengers: Endgame')
      expect(result.originalTitle).toBe('Avengers: Endgame')
      expect(result.year).toBe(2019)
      expect(result.voteAverage).toBe(8.3) // rounded to 1 decimal
      expect(result.genreIds).toEqual([12, 878, 28])
      expect(result.posterUrl).toContain('/or06FN3Dka5tukK1e9sl16pB3iy.jpg')
      expect(result.backdropUrl).toContain('/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg')
    })

    it('should handle missing release_date', () => {
      const raw = { ...fixtures.tmdbMovie.raw, release_date: '' }
      const result = mapMovie(raw as any)
      expect(result.year).toBe(0)
    })

    it('should handle null poster_path', () => {
      const raw = { ...fixtures.tmdbMovie.raw, poster_path: null }
      const result = mapMovie(raw as any)
      expect(result.posterUrl).toBe('/placeholder.jpg')
    })

    it('should use title if original_title is empty', () => {
      const raw = { ...fixtures.tmdbMovie.raw, title: '', original_title: 'Fallback' }
      const result = mapMovie(raw as any)
      expect(result.title).toBe('Fallback')
    })
  })

  describe('mapGenre()', () => {
    it('should map TMDB genre to app model', () => {
      const result = mapGenre({ id: 28, name: 'Action' })
      expect(result.id).toBe(28)
      expect(result.name).toBe('Action')
      expect(result.slug).toBe('action')
    })

    it('should handle multi-word genre names', () => {
      const result = mapGenre({ id: 878, name: 'Science Fiction' })
      expect(result.slug).toBe('science-fiction')
    })
  })

  describe('mapMovieDetail()', () => {
    it('should map detail with runtime formatting', () => {
      const raw = {
        ...fixtures.tmdbMovie.raw,
        genres: [{ id: 28, name: 'Action' }],
        runtime: 181,
        tagline: 'Part of the journey is the end.',
        status: 'Released',
        budget: 356000000,
        revenue: 2797800564,
        imdb_id: 'tt4154796',
        homepage: 'https://marvel.com',
      }

      const result = mapMovieDetail(raw as any)
      expect(result.runtimeFormatted).toBe('3h 1m')
      expect(result.tagline).toBe('Part of the journey is the end.')
      expect(result.imdbId).toBe('tt4154796')
      expect(result.genres).toHaveLength(1)
      expect(result.genres[0].name).toBe('Action')
    })

    it('should handle zero runtime', () => {
      const raw = { ...fixtures.tmdbMovie.raw, genres: [], runtime: 0 }
      const result = mapMovieDetail(raw as any)
      expect(result.runtimeFormatted).toBe('')
    })

    it('should pick trailer from videos', () => {
      const videos = [
        { id: '1', key: 'abc', name: 'Teaser', site: 'YouTube', type: 'Teaser', iso_639_1: 'en', iso_3166_1: 'US', size: 1080, official: true, published_at: '2019-01-01' },
        { id: '2', key: 'def', name: 'Official Trailer', site: 'YouTube', type: 'Trailer', iso_639_1: 'en', iso_3166_1: 'US', size: 1080, official: true, published_at: '2019-02-01' },
      ]
      const raw = { ...fixtures.tmdbMovie.raw, genres: [], runtime: 120 }
      const result = mapMovieDetail(raw as any, undefined, videos)
      expect(result.trailer?.key).toBe('def') // Trailer takes priority over Teaser
    })

    it('should handle no videos', () => {
      const raw = { ...fixtures.tmdbMovie.raw, genres: [], runtime: 120 }
      const result = mapMovieDetail(raw as any, undefined, undefined)
      expect(result.trailer).toBeNull()
    })
  })
})
