// ============================================
// Watch History Types — unified data model
// ============================================
// Used by both localStorage (client) and DB sync (future).
// Designed to be storage-agnostic: same shape regardless of backend.

/**
 * A single watch history record.
 * Represents progress for one episode/movie at a specific point in time.
 */
export interface WatchHistoryItem {
  /** Movie identifier (DB id, slug, or TMDB id string) */
  movieId: string
  /** URL-friendly movie slug for building watch URLs */
  movieSlug: string
  /** Display title */
  movieTitle: string
  /** Poster image URL */
  posterUrl?: string
  /** Thumbnail image URL (fallback for poster) */
  thumbUrl?: string

  /** Episode identifier within the movie */
  episodeId: string
  /** Display name: "Tập 1", "Full", etc. */
  episodeName: string
  /** URL-friendly episode slug */
  episodeSlug?: string

  /** Name of the server used for playback */
  serverName?: string
  /** Index of the selected server */
  serverIndex?: number
  /** Index of the episode within the server */
  episodeIndex?: number

  /** Current playback position in seconds */
  currentTime: number
  /** Total duration of the video in seconds */
  duration: number
  /** Playback progress as percentage (0–100) */
  progressPercent: number

  /** ISO 8601 timestamp of last watch activity */
  lastWatchedAt: string
  /** Whether the episode is considered completed (>= 90%) */
  completed: boolean

  /** The stream URL that was playing (for debugging / resume) */
  sourceUrl?: string
}

/**
 * Input for saving/updating watch progress.
 * A subset of WatchHistoryItem — only fields that change during playback.
 */
export interface SaveWatchProgressInput {
  movieId: string
  movieSlug: string
  movieTitle: string
  posterUrl?: string
  thumbUrl?: string

  episodeId: string
  episodeName: string
  episodeSlug?: string

  serverName?: string
  serverIndex?: number
  episodeIndex?: number

  currentTime: number
  duration: number

  sourceUrl?: string
}

/**
 * Item returned by getContinueWatching — same as WatchHistoryItem.
 * Aliased for semantic clarity in UI components.
 */
export type ContinueWatchingItem = WatchHistoryItem
