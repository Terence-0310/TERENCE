// ============================================
// TMDB Trailer Provider — fallback to YouTube trailer
// ============================================

import type { VideoSourceProvider } from './provider'
import type { MovieDetail, PlaybackSource, Episode, SourceType } from '@/types/movie'

/**
 * Uses the TMDB trailer data already fetched in MovieDetail.
 * This is the fallback when no other provider has the actual movie source.
 * Priority: 99 (lowest — checked last)
 */
export class TmdbTrailerProvider implements VideoSourceProvider {
  readonly name = 'tmdb-trailer'
  readonly priority = 99

  async hasSource(movie: MovieDetail): Promise<boolean> {
    return !!movie.trailer && !!movie.trailer.embedUrl
  }

  async getPlayback(movie: MovieDetail): Promise<PlaybackSource | null> {
    if (!movie.trailer) return null
    return {
      url: movie.trailer.embedUrl,
      type: 'youtube',
      label: movie.trailer.name || 'Trailer',
    }
  }

  async getEpisodes(): Promise<Episode[]> {
    // Trailers don't have episodes
    return []
  }

  getSourceType(movie: MovieDetail): SourceType {
    return movie.trailer ? 'youtube' : 'none'
  }
}
