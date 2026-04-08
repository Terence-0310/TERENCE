// ============================================
// Cache Layer — Unified in-memory cache with TTL
// ============================================
// Lightweight, zero-dependency cache for server-side data.
// Supports tag-based invalidation compatible with Next.js patterns.
//
// Usage:
//   import { cache } from '@/lib/cache'
//   const data = await cache.getOrSet('homepage:trending', () => fetchTrending(), { ttl: 1800 })
//   cache.invalidateTag('homepage')

interface CacheEntry<T> {
  data: T
  expiresAt: number
  tags: string[]
}

interface CacheOptions {
  /** Time-to-live in seconds (default: 300 = 5 minutes) */
  ttl?: number
  /** Tags for group invalidation */
  tags?: string[]
}

class AppCache {
  private store = new Map<string, CacheEntry<unknown>>()
  private static instance: AppCache

  static getInstance(): AppCache {
    if (!AppCache.instance) {
      AppCache.instance = new AppCache()
    }
    return AppCache.instance
  }

  /**
   * Get cached value or compute + cache it.
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => T | Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const existing = this.get<T>(key)
    if (existing !== undefined) return existing

    const data = await fetcher()
    this.set(key, data, options)
    return data
  }

  /**
   * Get a value from cache. Returns undefined if not found or expired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }

    return entry.data as T
  }

  /**
   * Set a value in cache.
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl ?? 300
    const tags = options.tags ?? []

    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttl * 1000,
      tags,
    })
  }

  /**
   * Invalidate a specific key.
   */
  invalidate(key: string): void {
    this.store.delete(key)
  }

  /**
   * Invalidate all entries with a given tag.
   */
  invalidateTag(tag: string): void {
    for (const [key, entry] of this.store) {
      if (entry.tags.includes(tag)) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Invalidate all entries.
   */
  invalidateAll(): void {
    this.store.clear()
  }

  /**
   * Get cache stats for debugging.
   */
  stats(): { size: number; keys: string[] } {
    // Clean expired first
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key)
    }
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    }
  }
}

export const cache = AppCache.getInstance()

// ── Cache key builders ──
// Centralize key creation to avoid typos and collisions

export const CacheKeys = {
  // Homepage
  homeTrending: (page = 1) => `home:trending:${page}`,
  homePopular: (page = 1) => `home:popular:${page}`,
  homeTopRated: (page = 1) => `home:top_rated:${page}`,
  homeNowPlaying: (page = 1) => `home:now_playing:${page}`,
  homeUpcoming: (page = 1) => `home:upcoming:${page}`,

  // Taxonomy
  genres: () => 'taxonomy:genres',
  countries: () => 'taxonomy:countries',
  genresWithCount: () => 'taxonomy:genres:with_count',
  countriesWithCount: () => 'taxonomy:countries:with_count',

  // Movie
  movieDetail: (idOrSlug: string) => `movie:detail:${idOrSlug}`,
  moviesByGenre: (genreId: string, page = 1) => `movies:genre:${genreId}:${page}`,
  moviesByCountry: (code: string, page = 1) => `movies:country:${code}:${page}`,
  moviesByType: (type: string, page = 1) => `movies:type:${type}:${page}`,

  // People
  popularActors: (page = 1) => `people:popular:${page}`,
  personDetail: (id: string) => `person:detail:${id}`,

  // Reviews
  reviews: (page = 1) => `reviews:list:${page}`,
  reviewDetail: (id: string) => `review:detail:${id}`,

  // Schedule
  schedule: (date: string) => `schedule:${date}`,

  // Search
  searchSuggestions: (q: string) => `search:suggest:${q.toLowerCase().trim()}`,
} as const

// ── Cache tags ──
export const CacheTags = {
  HOME: 'homepage',
  TAXONOMY: 'taxonomy',
  MOVIE: 'movie',
  REVIEW: 'review',
  SCHEDULE: 'schedule',
  PERSON: 'person',
} as const
