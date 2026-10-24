// ============================================
// Shared Sync Types — OPhim/OPhim18/KKPhim
// ============================================
// Sprint 4B: Extracted from types.ts and ophim18-types.ts
// to eliminate 100%-identical type duplication.
//
// These types define the mapped data structures used by both
// OPhim and OPhim18 sync pipelines after API data is normalized.
// They are purely compile-time types — zero runtime code.

/** Mapped movie data ready for Prisma upsert */
export interface MappedMovie {
  ophimId: string
  slug: string
  title: string
  originalTitle: string | null
  description: string | null
  contentType: string
  status: string
  quality: string | null
  language: string | null
  year: number | null
  episodeCurrent: string | null
  episodeTotal: number | null
  trailerUrl: string | null
  thumbUrl: string | null
  posterUrl: string | null
  isCopyright: boolean



  tmdbId: number | null
  imdbId: string | null
  metadataSource: string
  sourceStatus: string
}

/** Mapped episode data ready for Prisma upsert */
export interface MappedEpisode {
  sourceName: string
  serverName: string
  episodeName: string
  episodeSlug: string
  episodeNumber: number
  episodeOrder: number
  streamType: string
  streamUrl: string | null
  sourceUrl: string | null
  status: string
  isActive: boolean
}

/** Mapped category for movie–category relation */
export interface MappedCategory {
  name: string
  slug: string
}

/** Mapped country for movie–country relation */
export interface MappedCountry {
  name: string
  slug: string
}

/** Result of a single movie sync operation */
export interface SyncResult {
  action: 'create' | 'update' | 'skip' | 'fail'
  movieSlug: string
  movieTitle: string
  movieId?: string
  episodeCount?: number
  message?: string
  error?: string
}
