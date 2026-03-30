// ============================================
// Player Source Types — unified output format
// ============================================
// These types define the canonical shape that every player component expects.
// All data from any source (OPhim v1, OPhim18, DB, legacy) MUST be
// normalized to these types before being passed to HLSPlayer.

/**
 * A single playable episode within a server.
 */
export interface PlayerEpisode {
  /** Display name: "Tập 1", "Full", etc. */
  name: string
  /** URL-friendly slug: "tap-1", "full", etc. */
  slug: string
  /** Stream URL — must be a valid, playable URL (m3u8, mp4) */
  url: string
}

/**
 * A named server containing one or more episodes.
 * A "server" in OPhim terms is a streaming source provider
 * (e.g. "Vietsub #1", "Thuyết Minh #1").
 */
export interface PlayerServer {
  /** Display name for this server */
  name: string
  /** List of playable episodes */
  episodes: PlayerEpisode[]
}

/**
 * The top-level output of the source adapter.
 * Contains all available servers with their episodes.
 */
export interface PlayerSourceMap {
  servers: PlayerServer[]
}

// ── Empty singleton — safe to return instead of throwing ──

export const EMPTY_SOURCE_MAP: PlayerSourceMap = Object.freeze({ servers: [] })
