// ============================================
// DB Video Provider — resolves playback from local database
// ============================================
// Priority: 1 (highest — checked before all other providers)
// This provider looks up movies in the local database and returns
// HLS/MP4 sources managed by admins via the dashboard.

import type { VideoSourceProvider } from './provider'
import type { MovieDetail, PlaybackSource, Episode, SourceType } from '@/types/movie'
import { prisma } from '@/lib/db'

export class DbVideoProvider implements VideoSourceProvider {
  readonly name = 'Terence'
  readonly priority = 1

  /**
   * Check if the movie exists in DB with at least one active episode that has a source.
   */
  async hasSource(movie: MovieDetail): Promise<boolean> {
    // Find movie in DB by TMDB ID
    const dbMovie = await this.findDbMovie(movie.id)
    if (!dbMovie) return false

    // Check if any episode has an active source
    const episodeWithSource = await prisma.episode.findFirst({
      where: {
        movieId: dbMovie.id,
        isActive: true,
        isPublished: true,
        status: 'active',
        OR: [
          { streamUrl: { not: null } },
          { videoSources: { some: { isActive: true } } },
        ],
      },
    })

    return !!episodeWithSource
  }

  /**
   * Get playback source for a specific episode or the first available.
   */
  async getPlayback(movie: MovieDetail, episodeSlug?: string): Promise<PlaybackSource | null> {
    const dbMovie = await this.findDbMovie(movie.id)
    if (!dbMovie) return null

    // Find target episode
    let episode: any = null
    if (episodeSlug) {
      episode = await prisma.episode.findFirst({
        where: {
          movieId: dbMovie.id,
          isActive: true,
          isPublished: true,
          status: 'active',
          OR: [
            { episodeSlug },
            { slug: episodeSlug },
          ],
        },
        include: {
          videoSources: { where: { isActive: true }, orderBy: { isPrimary: 'desc' } },
          subtitleTracks: { where: { isActive: true }, orderBy: { isDefault: 'desc' } },
        },
      })
    }

    // Fallback to first episode
    if (!episode) {
      episode = await prisma.episode.findFirst({
        where: {
          movieId: dbMovie.id,
          isActive: true,
          isPublished: true,
          status: 'active',
        },
        orderBy: [{ episodeOrder: 'asc' }, { episodeNumber: 'asc' }],
        include: {
          videoSources: { where: { isActive: true }, orderBy: { isPrimary: 'desc' } },
          subtitleTracks: { where: { isActive: true }, orderBy: { isDefault: 'desc' } },
        },
      })
    }

    if (!episode) return null

    // Get source — prefer VideoSource records, fallback to legacy streamUrl
    let url: string | null = null
    let type: 'hls' | 'mp4' = 'mp4'
    let label = 'Main'

    if (episode.videoSources && episode.videoSources.length > 0) {
      const primary = episode.videoSources.find((s: any) => s.isPrimary) || episode.videoSources[0]
      url = primary.url
      type = primary.sourceType as 'hls' | 'mp4'
      label = primary.label
    } else if (episode.streamUrl) {
      url = episode.streamUrl
      type = (episode.streamType === 'hls' ? 'hls' : 'mp4') as 'hls' | 'mp4'
      label = episode.quality || 'Main'
    }

    if (!url) return null

    // Build subtitle list
    const subtitles = (episode.subtitleTracks || []).map((sub: any) => ({
      url: sub.url,
      lang: sub.lang,
      label: sub.label,
      default: sub.isDefault,
    }))

    return { url, type, label, subtitles }
  }

  /**
   * Get all active/published episodes for a movie.
   */
  async getEpisodes(movie: MovieDetail): Promise<Episode[]> {
    const dbMovie = await this.findDbMovie(movie.id)
    if (!dbMovie) return []

    const episodes = await prisma.episode.findMany({
      where: {
        movieId: dbMovie.id,
        isActive: true,
        isPublished: true,
        status: 'active',
      },
      orderBy: [{ episodeOrder: 'asc' }, { episodeNumber: 'asc' }],
    })

    return episodes.map((ep) => ({
      id: ep.id,
      number: ep.episodeNumber,
      title: ep.episodeName || ep.title || `Tập ${ep.episodeNumber}`,
      slug: ep.episodeSlug || `tap-${ep.episodeNumber}`,
      duration: ep.duration ? this.formatDuration(ep.duration) : undefined,
    }))
  }

  getSourceType(_movie: MovieDetail): SourceType {
    return 'hls'
  }

  // ── Private helpers ──

  private async findDbMovie(tmdbId: number) {
    return prisma.movie.findFirst({
      where: {
        OR: [{ tmdbId }],
        isActive: true,
      },
    })
  }

  private formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return s > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${m}:00`
  }
}
