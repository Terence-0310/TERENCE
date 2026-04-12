export interface PlayerServerEpisode {
  name: string
  slug: string
  url: string
}

export interface PlayerServer {
  name: string
  episodes: PlayerServerEpisode[]
}

export interface PlayerMovieMeta {
  movieSlug: string
  movieTitle: string
  posterUrl?: string
  thumbUrl?: string
  trailerUrl?: string
}

export interface SubtitleTrack {
  id: string
  label: string
  lang: string
  url: string
  isDefault: boolean
  kind: string
}

// Playback state that represents the current status of the engine
export interface PlayerState {
  isPlaying: boolean
  isLoading: boolean
  hasError: boolean
  errorMessage: string
  currentTime: number
  duration: number
  buffered: number
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  playbackRate: number
}
