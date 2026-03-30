// ============================================
// Watch History — Service Layer (domain logic)
// ============================================
// Business logic for watch progress tracking, continue watching,
// and history management. Uses the storage layer for persistence.
//
// This is the layer that UI hooks and components should call.
// The storage layer can be swapped (localStorage → API) without
// changing any code in this file.
//
// SSR-safe: delegates all storage access to storage.ts which
// handles window checks internally.

import type {
  WatchHistoryItem,
  SaveWatchProgressInput,
  ContinueWatchingItem,
} from '@/types/watch-history'
import {
  getWatchHistoryFromStorage,
  upsertWatchHistoryItem,
  removeWatchHistoryItem,
  removeMovieFromHistory,
  clearWatchHistory as clearStorage,
} from './storage'
import {
  COMPLETED_THRESHOLD,
  MIN_SECONDS_TO_SAVE,
  MIN_PROGRESS_TO_SHOW,
  MAX_PROGRESS_TO_SHOW,
} from './constants'

// ═══════════════════════════════════════════════════════════════
// CORE: SAVE / UPDATE PROGRESS
// ═══════════════════════════════════════════════════════════════

/**
 * Save or update watch progress for an episode.
 *
 * Rules:
 * - Only saves if currentTime > MIN_SECONDS_TO_SAVE
 * - Calculates progressPercent from currentTime/duration
 * - Auto-marks completed if progress >= COMPLETED_THRESHOLD
 * - Updates lastWatchedAt to current time
 * - Merges with existing metadata (poster, title, etc.)
 *
 * @returns Updated full watch history list
 */
export function saveWatchProgress(input: SaveWatchProgressInput): WatchHistoryItem[] {
  const { currentTime, duration } = input

  // Validate: don't save negligible progress
  if (currentTime < MIN_SECONDS_TO_SAVE) return getWatchHistoryFromStorage()
  if (duration <= 0) return getWatchHistoryFromStorage()

  // Calculate progress
  const progressPercent = Math.min(100, Math.round((currentTime / duration) * 100))
  const completed = progressPercent >= COMPLETED_THRESHOLD

  const item: WatchHistoryItem = {
    movieId: input.movieId,
    movieSlug: input.movieSlug,
    movieTitle: input.movieTitle,
    posterUrl: input.posterUrl,
    thumbUrl: input.thumbUrl,
    episodeId: input.episodeId,
    episodeName: input.episodeName,
    episodeSlug: input.episodeSlug,
    serverName: input.serverName,
    serverIndex: input.serverIndex,
    episodeIndex: input.episodeIndex,
    currentTime,
    duration,
    progressPercent,
    lastWatchedAt: new Date().toISOString(),
    completed,
    sourceUrl: input.sourceUrl,
  }

  return upsertWatchHistoryItem(item)
}

// ═══════════════════════════════════════════════════════════════
// CONTINUE WATCHING
// ═══════════════════════════════════════════════════════════════

/**
 * Get the "Continue Watching" list.
 *
 * Rules:
 * - Only items with progress between MIN_PROGRESS_TO_SHOW and MAX_PROGRESS_TO_SHOW
 * - Groups by movieId — only the most recent episode per movie
 * - Sorted by lastWatchedAt descending (most recent first)
 * - Excludes completed items
 *
 * @param limit Maximum items to return (default 20)
 */
export function getContinueWatching(limit: number = 20): ContinueWatchingItem[] {
  const all = getWatchHistoryFromStorage()

  // Filter to eligible items
  const eligible = all.filter(
    (item) =>
      !item.completed &&
      item.currentTime >= MIN_SECONDS_TO_SAVE &&
      item.progressPercent >= MIN_PROGRESS_TO_SHOW &&
      item.progressPercent < MAX_PROGRESS_TO_SHOW,
  )

  // Group by movieId — keep only the most recent episode per movie
  const movieMap = new Map<string, ContinueWatchingItem>()
  // Sort by lastWatchedAt desc first so Map keeps most recent
  const sorted = eligible.sort(
    (a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime(),
  )

  for (const item of sorted) {
    if (!movieMap.has(item.movieId)) {
      movieMap.set(item.movieId, item)
    }
  }

  return Array.from(movieMap.values()).slice(0, limit)
}

/**
 * Get the latest watched items (including completed).
 * Unlike getContinueWatching, this includes all items — useful for
 * a "Watch History" page.
 *
 * @param limit Maximum items to return
 */
export function getLatestWatchedItems(limit: number = 50): WatchHistoryItem[] {
  return getWatchHistoryFromStorage()
    .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime())
    .slice(0, limit)
}

// ═══════════════════════════════════════════════════════════════
// PROGRESS QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get the most recent watch record for a movie (any episode).
 * Useful for showing "continue watching" on movie detail pages.
 */
export function getMovieProgress(movieId: string): WatchHistoryItem | null {
  const items = getWatchHistoryFromStorage()
    .filter((h) => h.movieId === movieId)
    .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime())

  return items[0] || null
}

/**
 * Get the watch record for a specific episode.
 * Used for resume playback (seeking to last position).
 */
export function getEpisodeProgress(
  movieId: string,
  episodeId: string,
): WatchHistoryItem | null {
  const items = getWatchHistoryFromStorage()
  return items.find((h) => h.movieId === movieId && h.episodeId === episodeId) || null
}

// ═══════════════════════════════════════════════════════════════
// MARK COMPLETED / REMOVE
// ═══════════════════════════════════════════════════════════════

/**
 * Mark an episode as completed.
 * Sets completed = true and progressPercent = 100.
 * Does NOT remove from history — just hides from "continue watching".
 */
export function markEpisodeCompleted(
  movieId: string,
  episodeId: string,
): WatchHistoryItem[] {
  const all = getWatchHistoryFromStorage()
  const item = all.find((h) => h.movieId === movieId && h.episodeId === episodeId)

  if (!item) return all

  const updated: WatchHistoryItem = {
    ...item,
    completed: true,
    progressPercent: 100,
    lastWatchedAt: new Date().toISOString(),
  }

  return upsertWatchHistoryItem(updated)
}

/**
 * Remove a specific episode from "continue watching" (and history).
 */
export function removeContinueWatching(
  movieId: string,
  episodeId: string,
): WatchHistoryItem[] {
  return removeWatchHistoryItem(movieId, episodeId)
}

/**
 * Remove all history for a movie.
 */
export function removeMovieHistory(movieId: string): WatchHistoryItem[] {
  return removeMovieFromHistory(movieId)
}

/**
 * Clear all watch history.
 */
export function clearAllHistory(): void {
  clearStorage()
}

// ═══════════════════════════════════════════════════════════════
// RESUME PLAYBACK HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Get the resume time in seconds for a specific episode.
 * Returns null if no progress, progress too small, or episode completed.
 *
 * Used by HLSPlayer to seek on load.
 */
export function getResumeTime(
  movieId: string,
  episodeId: string,
): number | null {
  const item = getEpisodeProgress(movieId, episodeId)
  if (!item) return null
  if (item.completed) return null
  if (item.currentTime < MIN_SECONDS_TO_SAVE) return null
  if (item.progressPercent >= MAX_PROGRESS_TO_SHOW) return null
  return item.currentTime
}

// ═══════════════════════════════════════════════════════════════
// FUTURE: REMOTE SYNC INTEGRATION POINTS
// ═══════════════════════════════════════════════════════════════

// TODO: When user authentication is integrated, implement:
//
// async function syncToRemote(userId: string): Promise<void> {
//   const local = getWatchHistoryFromStorage()
//   // POST to /api/v1/watch-history/sync with local items
//   // Server merges with remote, returns merged list
//   // Save merged list back to storage
// }
//
// async function loadFromRemote(userId: string): Promise<WatchHistoryItem[]> {
//   // GET from /api/v1/watch-history?userId=...
//   // Return remote items
// }
//
// function mergeLocalAndRemote(
//   local: WatchHistoryItem[],
//   remote: WatchHistoryItem[],
// ): WatchHistoryItem[] {
//   // For each (movieId, episodeId) pair:
//   //   - Keep the record with the later lastWatchedAt
//   //   - If same timestamp, prefer the one with higher currentTime
//   // Return merged, deduplicated list
// }
//
// The service functions above (saveWatchProgress, getContinueWatching, etc.)
// should be updated to:
// 1. Save to local storage (immediate, for responsiveness)
// 2. Queue a debounced sync to remote (non-blocking)
// 3. On app load, merge remote + local
