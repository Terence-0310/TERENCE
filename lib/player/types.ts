// ============================================
// Player Types — shared between server & client
// ============================================

export interface PlayableMovie {
  id: string
  tmdbId: number | null
  slug: string
  title: string
  originalTitle: string | null
  description: string | null
  contentType: string
  posterUrl: string | null
  backdropUrl: string | null
  year: number | null
  quality: string | null
  rating: number | null
  categoryText: string | null

  countryText: string | null
}

export interface PlayableEpisode {
  id: string
  episodeNumber: number
  episodeName: string | null
  episodeSlug: string | null
  title: string | null
  description: string | null
  thumbnailUrl: string | null
  duration: number | null
  isActive: boolean
}

export interface PlayableSource {
  id: string
  sourceType: 'hls' | 'mp4'
  url: string
  label: string
  isPrimary: boolean
  mimeType: string | null
}

export interface PlayableSubtitle {
  id: string
  label: string
  lang: string
  url: string
  isDefault: boolean
  kind: string
}

export interface EpisodePlaybackData {
  episode: PlayableEpisode
  sources: PlayableSource[]
  primarySource: PlayableSource | null
  subtitles: PlayableSubtitle[]
  nextEpisode: PlayableEpisode | null
  prevEpisode: PlayableEpisode | null
}

export interface MoviePlaybackData {
  movie: PlayableMovie
  episodes: PlayableEpisode[]
  currentEpisode: EpisodePlaybackData | null
  totalEpisodes: number
}

export interface WatchProgressData {
  movieId: string
  episodeId: string | null
  progressSeconds: number
  durationSeconds: number
  percent: number
  completed: boolean
  lastWatchedAt: string
}

export interface ContinueWatchingItem {
  movie: PlayableMovie
  episode: PlayableEpisode | null
  progress: WatchProgressData
}
