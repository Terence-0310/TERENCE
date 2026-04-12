// ============================================
// Video Source Provider — Interface contract
// ============================================

import type { MovieDetail, MovieSourceResult, Episode, PlaybackSource, SourceType } from '@/types/movie'

/**
 * Base interface for all video source providers.
 * Each provider implements how to resolve playback URLs for a given movie.
 */
export interface VideoSourceProvider {
  /** Unique name of this provider */
  readonly name: string

  /** Priority (lower = checked first) */
  readonly priority: number

  /** Check if this provider has a source for the given movie */
  hasSource(movie: MovieDetail): Promise<boolean>

  /** Get the playback source (URL, type, quality) */
  getPlayback(movie: MovieDetail, episodeSlug?: string): Promise<PlaybackSource | null>

  /** Get episode list (for series or multi-part content) */
  getEpisodes(movie: MovieDetail): Promise<Episode[]>

  /** Get the source type this provider uses */
  getSourceType(movie: MovieDetail): SourceType
}
