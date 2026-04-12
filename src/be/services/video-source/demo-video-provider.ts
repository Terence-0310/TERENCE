// ============================================
// Demo Video Provider — sample videos for demo/presentation
// ============================================

import type { VideoSourceProvider } from './provider'
import type { MovieDetail, PlaybackSource, Episode, SourceType } from '@/types/movie'

/**
 * Maps TMDB movie IDs to public-domain / creative-commons demo videos.
 * Used for đồ án demo purposes only.
 *
 * To add a demo source for any movie, add its TMDB ID and video URL below.
 * Supports: mp4, youtube, iframe embed
 *
 * Priority: 10 (high — checked before TMDB trailer fallback)
 */

// ── Demo video catalog ──────────────────────────
// Map<TMDB movie ID, demo source config>
const DEMO_CATALOG: Record<number, {
  url: string
  type: SourceType
  label?: string
  episodes?: Array<{ title: string; url: string; duration?: string }>
}> = {
  // ── Public-domain sample videos (Blender Foundation) ──
  // These work for any movie ID — just add the TMDB ID as key
  //
  // Example: Big Buck Bunny (free MP4)
  // 123: {
  //   url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  //   type: 'mp4',
  //   label: 'Demo 720p',
  // },
  //
  // Example: YouTube embed
  // 456: {
  //   url: 'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1',
  //   type: 'youtube',
  //   label: 'Demo YouTube',
  // },
  //
  // Example: with episodes (for series demo)
  // 789: {
  //   url: 'https://example.com/episode-1.mp4',
  //   type: 'mp4',
  //   label: 'Tập 1',
  //   episodes: [
  //     { title: 'Tập 1: Khởi đầu', url: 'https://example.com/ep1.mp4', duration: '24:00' },
  //     { title: 'Tập 2: Phát triển', url: 'https://example.com/ep2.mp4', duration: '23:30' },
  //   ],
  // },

  // ── Fallback: any TMDB ID not listed will not match ──
}

// ── Slug-based lookup (for future expansion) ──
const SLUG_CATALOG: Record<string, typeof DEMO_CATALOG[number]> = {
  // Example: 'big-buck-bunny': { url: '...', type: 'mp4' },
}

export class DemoVideoProvider implements VideoSourceProvider {
  readonly name = 'demo-video'
  readonly priority = 10

  private getConfig(movie: MovieDetail) {
    // Check by TMDB ID first, then by slug
    return DEMO_CATALOG[movie.id] || SLUG_CATALOG[this.toSlug(movie.title)] || null
  }

  private toSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  async hasSource(movie: MovieDetail): Promise<boolean> {
    return !!this.getConfig(movie)
  }

  async getPlayback(movie: MovieDetail, episodeSlug?: string): Promise<PlaybackSource | null> {
    const config = this.getConfig(movie)
    if (!config) return null

    // If requesting a specific episode
    if (episodeSlug && config.episodes) {
      const ep = config.episodes.find(
        (_, i) => `tap-${i + 1}` === episodeSlug,
      )
      if (ep) {
        return { url: ep.url, type: config.type, label: ep.title }
      }
    }

    return {
      url: config.url,
      type: config.type,
      label: config.label || 'Demo',
    }
  }

  async getEpisodes(movie: MovieDetail): Promise<Episode[]> {
    const config = this.getConfig(movie)
    if (!config?.episodes) return []

    return config.episodes.map((ep, i) => ({
      id: `demo-${movie.id}-ep-${i + 1}`,
      number: i + 1,
      title: ep.title,
      slug: `tap-${i + 1}`,
      duration: ep.duration,
    }))
  }

  getSourceType(movie: MovieDetail): SourceType {
    const config = this.getConfig(movie)
    return config?.type || 'none'
  }
}
