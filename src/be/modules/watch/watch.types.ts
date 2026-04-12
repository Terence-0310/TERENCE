// ============================================
// Watch Module — Types
// ============================================

// ── Bootstrap Response (GET /api/v1/watch-history/bootstrap) ──

export interface WatchBootstrapResponse {
  movie: WatchMovieDetail
  episodes: WatchEpisodeItem[]
  currentEpisode: WatchCurrentEpisode | null
  totalEpisodes: number
  resumeProgress: WatchResumeProgress | null
}

export interface WatchMovieDetail {
  id: string
  slug: string
  title: string
  originalTitle: string | null
  description: string | null
  contentType: string
  posterUrl: string | null
  backdropUrl: string | null
  thumbUrl: string | null
  year: number | null
  quality: string | null
  rating: number | null
  ageRating: string | null



}

export interface WatchEpisodeItem {
  id: string
  episodeNumber: number
  episodeName: string | null
  episodeSlug: string | null
  title: string | null
  thumbnailUrl: string | null
  duration: number | null
  isActive: boolean
}

export interface WatchVideoSource {
  id: string
  sourceType: 'hls' | 'mp4' | 'iframe'
  url: string
  label: string
  isPrimary: boolean
  mimeType: string | null
  priority: number
}

export interface WatchSubtitle {
  id: string
  label: string
  lang: string
  url: string
  isDefault: boolean
  kind: string
}

export interface WatchCurrentEpisode {
  episode: WatchEpisodeItem
  sources: WatchVideoSource[]
  primarySource: WatchVideoSource | null
  subtitles: WatchSubtitle[]
  nextEpisode: WatchEpisodeItem | null
  prevEpisode: WatchEpisodeItem | null
  servers: WatchServer[]
}

export interface WatchServer {
  name: string
  episodes: { name: string; slug: string; url: string }[]
}

export interface WatchResumeProgress {
  episodeId: string | null
  currentTime: number
  duration: number | null
  progress: number
  lastWatchedAt: string
}

// ── Progress API (POST /api/v1/watch-history/progress) ──

export interface SaveProgressInput {
  movieId: string
  episodeId: string | null
  currentTime: number
  duration: number
  deviceType?: string
}

export interface SaveProgressResponse {
  ok: boolean
  progress: number
  isCompleted: boolean
}

// ── Complete API (POST /api/v1/watch-history/complete) ──

export interface MarkCompleteInput {
  movieId: string
  episodeId: string | null
}

// ── Continue Watching (GET /api/v1/watch-history/continue) ──

export interface ContinueWatchingResponse {
  items: ContinueWatchingItem[]
  total: number
}

export interface ContinueWatchingItem {
  id: string
  movie: {
    id: string
    slug: string
    title: string
    posterUrl: string | null
    backdropUrl: string | null
    thumbUrl: string | null
    contentType: string
    year: number | null
    quality: string | null
  }
  episode: {
    id: string
    episodeNumber: number
    episodeName: string | null
    episodeSlug: string | null
  } | null
  progress: number
  currentTime: number
  duration: number | null
  lastWatchedAt: string
  isCompleted: boolean
}
