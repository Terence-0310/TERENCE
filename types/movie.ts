// ============================================
// App domain models (mapped from TMDB)
// ============================================

export interface Movie {
  id: number
  title: string
  originalTitle: string
  overview: string
  posterUrl: string | null
  backdropUrl: string | null
  releaseDate: string
  year: number
  voteAverage: number
  voteCount: number
  popularity: number
  genreIds: number[]
  genres: Genre[]
  runtime: number | null
  runtimeFormatted: string
  mediaType: 'movie' | 'tv'
}

export interface MovieDetail extends Movie {
  tagline: string | null
  status: string
  budget: number
  revenue: number
  imdbId: string | null
  homepage: string | null
  cast: CastMember[]
  crew: CrewMember[]
  trailer: VideoItem | null
  videos: VideoItem[]
  relatedMovies: Movie[]
}

export interface Genre {
  id: number
  name: string
  slug: string
}

export interface CastMember {
  id: number
  name: string
  character: string
  profileUrl: string | null
}

export interface CrewMember {
  id: number
  name: string
  job: string
  department: string
}

export interface VideoItem {
  id: string
  key: string
  name: string
  site: string
  type: string
  isTrailer: boolean
  youtubeUrl: string
  embedUrl: string
}

export interface PaginatedResult<T> {
  items: T[]
  page: number
  totalPages: number
  totalResults: number
}

// Watch types
export interface VideoSource {
  url: string
  type: 'hls' | 'mp4' | 'dash' | 'youtube'
  quality?: string
  label?: string
}

export interface SubtitleTrack {
  url: string
  lang: string
  label: string
  default?: boolean
}

export interface WatchProgress {
  movieId: number
  currentTime: number
  duration: number
  percentage: number
  updatedAt: string
}

// ── Video Provider Abstraction ──────────────────

export type SourceType = 'youtube' | 'mp4' | 'hls' | 'iframe' | 'none'

export interface Episode {
  id: string
  number: number
  title: string
  slug: string
  duration?: string
}

export interface PlaybackSource {
  url: string
  type: SourceType
  quality?: string
  label?: string
  subtitles?: SubtitleTrack[]
}

export interface MovieSourceResult {
  available: boolean
  sourceType: SourceType
  providerName: string
  playback: PlaybackSource | null
  episodes: Episode[]
}
