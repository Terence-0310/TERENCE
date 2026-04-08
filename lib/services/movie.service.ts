// ============================================
// Movie Service — Business logic layer
// ============================================
// Composes: repository + cache + TMDB
// Pages and API routes use this, NOT repositories directly.

import { movieRepository } from '@/lib/repositories/movie.repository'
import { cache, CacheKeys, CacheTags } from '@/lib/cache'
import * as tmdbMovieService from '@/services/tmdb/movie-service'

// ── Cache TTLs (seconds) ──
const TTL = {
  HOMEPAGE: 300,      // 5 min
  LISTING: 600,       // 10 min
  DETAIL: 900,        // 15 min
  SEARCH: 120,        // 2 min
} as const

export const movieService = {
  // ─────────────────────────────────────────
  // Homepage data (combined TMDB + DB)
  // ─────────────────────────────────────────

  /**
   * Get all homepage sections in one call (optimized)
   */
  async getHomepageData() {
    // TMDB data (external API — already has Next.js revalidate)
    const [trendingR, popularR, topRatedR, nowPlayingR, upcomingR, genresR] =
      await Promise.allSettled([
        tmdbMovieService.getTrending(),
        tmdbMovieService.getPopular(),
        tmdbMovieService.getTopRated(),
        tmdbMovieService.getNowPlaying(),
        tmdbMovieService.getUpcoming(),
        tmdbMovieService.getGenres(),
      ])

    const emptyPage = { items: [], page: 1, totalPages: 0, totalResults: 0 }

    // DB data (local — use cache)
    const [dbFeatured, dbTrending, dbLatest] = await Promise.allSettled([
      cache.getOrSet('home:db:featured', () => movieRepository.findFeatured(6), {
        ttl: TTL.HOMEPAGE, tags: [CacheTags.HOME],
      }),
      cache.getOrSet('home:db:trending', () => movieRepository.findTrending(20), {
        ttl: TTL.HOMEPAGE, tags: [CacheTags.HOME],
      }),
      cache.getOrSet('home:db:latest', () => movieRepository.findLatest(20), {
        ttl: TTL.HOMEPAGE, tags: [CacheTags.HOME],
      }),
    ])

    return {
      // TMDB sections
      tmdb: {
        trending: trendingR.status === 'fulfilled' ? trendingR.value : emptyPage,
        popular: popularR.status === 'fulfilled' ? popularR.value : emptyPage,
        topRated: topRatedR.status === 'fulfilled' ? topRatedR.value : emptyPage,
        nowPlaying: nowPlayingR.status === 'fulfilled' ? nowPlayingR.value : emptyPage,
        upcoming: upcomingR.status === 'fulfilled' ? upcomingR.value : emptyPage,
        genres: genresR.status === 'fulfilled' ? genresR.value : [],
      },
      // DB sections
      db: {
        featured: dbFeatured.status === 'fulfilled' ? dbFeatured.value : [],
        trending: dbTrending.status === 'fulfilled' ? dbTrending.value : [],
        latest: dbLatest.status === 'fulfilled' ? dbLatest.value : [],
      },
    }
  },

  // ─────────────────────────────────────────
  // Movie listing
  // ─────────────────────────────────────────

  async getByType(type: string, page = 1, limit = 24) {
    return cache.getOrSet(
      CacheKeys.moviesByType(type, page),
      () => movieRepository.findByType(type, page, limit),
      { ttl: TTL.LISTING, tags: [CacheTags.MOVIE] },
    )
  },

  async getByGenre(genreSlug: string, page = 1, limit = 24) {
    return cache.getOrSet(
      CacheKeys.moviesByGenre(genreSlug, page),
      () => movieRepository.findByGenre(genreSlug, page, limit),
      { ttl: TTL.LISTING, tags: [CacheTags.MOVIE] },
    )
  },

  async getByCountry(countrySlug: string, page = 1, limit = 24) {
    return cache.getOrSet(
      CacheKeys.moviesByCountry(countrySlug, page),
      () => movieRepository.findByCountry(countrySlug, page, limit),
      { ttl: TTL.LISTING, tags: [CacheTags.MOVIE] },
    )
  },

  // ─────────────────────────────────────────
  // Movie detail
  // ─────────────────────────────────────────

  async getDetail(slugOrId: string) {
    return cache.getOrSet(
      CacheKeys.movieDetail(slugOrId),
      () => movieRepository.findBySlugOrId(slugOrId),
      { ttl: TTL.DETAIL, tags: [CacheTags.MOVIE] },
    )
  },

  // ─────────────────────────────────────────
  // Search
  // ─────────────────────────────────────────

  async search(query: string, page = 1, limit = 24) {
    return movieRepository.search(query, page, limit)
  },

  /**
   * Search suggestions for autocomplete (lightweight)
   */
  async searchSuggestions(query: string, limit = 8) {
    const q = query.trim()
    if (q.length < 2) return []

    return cache.getOrSet(
      CacheKeys.searchSuggestions(q),
      async () => {
        const { data } = await movieRepository.search(q, 1, limit)
        return data.map((m: { id: string; slug: string; title: string; posterUrl: string | null; year: number | null; contentType: string }) => ({
          id: m.id,
          slug: m.slug,
          title: m.title,
          posterUrl: m.posterUrl,
          year: m.year,
          contentType: m.contentType,
        }))
      },
      { ttl: TTL.SEARCH },
    )
  },

  // ─────────────────────────────────────────
  // Interactions
  // ─────────────────────────────────────────

  async incrementView(id: string) {
    const result = await movieRepository.incrementView(id)
    // Invalidate detail cache
    cache.invalidate(CacheKeys.movieDetail(id))
    return result
  },

  // ─────────────────────────────────────────
  // TMDB passthrough (for convenience)
  // ─────────────────────────────────────────

  getTmdbDetail: tmdbMovieService.getMovieDetail,
  getTmdbByGenre: tmdbMovieService.getMoviesByGenre,
  getTmdbByCountry: tmdbMovieService.getMoviesByCountry,
}
