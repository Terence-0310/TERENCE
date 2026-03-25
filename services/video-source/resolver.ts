// ============================================
// Video Source Resolver — picks the best provider for a movie
// ============================================

import type { VideoSourceProvider } from './provider'
import type { MovieDetail, MovieSourceResult } from '@/types/movie'
import { DbVideoProvider } from './db-video-provider'
import { DemoVideoProvider } from './demo-video-provider'
import { TmdbTrailerProvider } from './tmdb-trailer-provider'

// ── Provider registry (sorted by priority at init) ──
const providers: VideoSourceProvider[] = [
  new DbVideoProvider(),      // priority 1 — DB sources (admin-managed)
  new DemoVideoProvider(),     // priority 10
  new TmdbTrailerProvider(),   // priority 99
].sort((a, b) => a.priority - b.priority)

/**
 * Resolve the best available video source for a movie.
 * Checks providers in priority order (lower priority number = checked first).
 * Returns the first provider that has a source.
 */
export async function resolveMovieSource(
  movie: MovieDetail,
  episodeSlug?: string,
): Promise<MovieSourceResult> {
  for (const provider of providers) {
    try {
      const available = await provider.hasSource(movie)
      if (!available) continue

      const [playback, episodes] = await Promise.all([
        provider.getPlayback(movie, episodeSlug),
        provider.getEpisodes(movie),
      ])

      if (playback) {
        return {
          available: true,
          sourceType: provider.getSourceType(movie),
          providerName: provider.name,
          playback,
          episodes,
        }
      }
    } catch (err) {
      console.error(`[Resolver] Provider "${provider.name}" error:`, err)
      continue
    }
  }

  // No provider has a source
  return {
    available: false,
    sourceType: 'none',
    providerName: '',
    playback: null,
    episodes: [],
  }
}

// Re-export for convenience
export type { VideoSourceProvider } from './provider'
