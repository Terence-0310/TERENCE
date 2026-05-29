// ============================================
// Watch History — Storage Layer (localStorage)
// ============================================
// Pure storage adapter — reads/writes WatchHistoryItem[] to localStorage.
// Designed to be swappable: replace this file with an API client
// to enable remote sync without touching the service layer.
//
// SSR-safe: all functions check `typeof window` before accessing storage.
// Never throws: returns safe defaults on parse/storage errors.

import type { WatchHistoryItem } from '@/types/watch-history'
import {
  WATCH_HISTORY_STORAGE_KEY,
  MAX_HISTORY_ITEMS,
  WATCH_HISTORY_CHANGE_EVENT,
} from './constants'

// ── Private helpers ──

function isClient(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Emit a custom event so other components (e.g. ContinueWatching)
 * can reactively update when history changes.
 */
function notifyChange(): void {
  if (!isClient()) return
  try {
    window.dispatchEvent(new CustomEvent(WATCH_HISTORY_CHANGE_EVENT))
  } catch {
    // Silently fail — event dispatch is non-critical
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC STORAGE API
// ═══════════════════════════════════════════════════════════════

/**
 * Read the full watch history from localStorage.
 * Returns [] if not available, corrupted, or on server.
 */
export function getWatchHistoryFromStorage(): WatchHistoryItem[] {
  if (!isClient()) return []
  try {
    const raw = localStorage.getItem(WATCH_HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Basic shape validation — filter out broken records
    return parsed.filter(
      (item: unknown) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>)['movieId'] === 'string' &&
        typeof (item as Record<string, unknown>)['episodeId'] === 'string' &&
        typeof (item as Record<string, unknown>)['currentTime'] === 'number',
    )
  } catch {
    return []
  }
}

/**
 * Write the full watch history to localStorage.
 * Evicts oldest items if over MAX_HISTORY_ITEMS.
 */
export function saveWatchHistoryToStorage(items: WatchHistoryItem[]): void {
  if (!isClient()) return
  try {
    let list = items
    // Evict oldest records if over limit
    if (list.length > MAX_HISTORY_ITEMS) {
      list = list
        .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime())
        .slice(0, MAX_HISTORY_ITEMS)
    }
    localStorage.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify(list))
    notifyChange()
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

/**
 * Upsert a single watch history item.
 * - If a record with same (movieId, episodeId) exists → update it
 * - Otherwise → prepend new record
 * Returns the updated full list.
 */
export function upsertWatchHistoryItem(item: WatchHistoryItem): WatchHistoryItem[] {
  const list = getWatchHistoryFromStorage()

  const existingIdx = list.findIndex(
    (h) => h.movieId === item.movieId && h.episodeId === item.episodeId,
  )

  if (existingIdx >= 0) {
    // Update existing — merge metadata (keep poster/title if new data is missing)
    const old = list[existingIdx]
    list[existingIdx] = {
      ...old,
      ...item,
      posterUrl: item.posterUrl || old.posterUrl,
      thumbUrl: item.thumbUrl || old.thumbUrl,
      movieTitle: item.movieTitle || old.movieTitle,
      movieSlug: item.movieSlug || old.movieSlug,
    }
  } else {
    // New record — prepend to front
    list.unshift(item)
  }

  saveWatchHistoryToStorage(list)
  return getWatchHistoryFromStorage()
}

/**
 * Remove a specific watch history item by (movieId, episodeId).
 * Returns the updated list.
 */
export function removeWatchHistoryItem(
  movieId: string,
  episodeId: string,
): WatchHistoryItem[] {
  const list = getWatchHistoryFromStorage().filter(
    (h) => !(h.movieId === movieId && h.episodeId === episodeId),
  )
  saveWatchHistoryToStorage(list)
  return list
}

/**
 * Remove all watch history items for a specific movie.
 * Returns the updated list.
 */
export function removeMovieFromHistory(movieId: string): WatchHistoryItem[] {
  const list = getWatchHistoryFromStorage().filter((h) => h.movieId !== movieId)
  saveWatchHistoryToStorage(list)
  return list
}

/**
 * Clear all watch history.
 */
export function clearWatchHistory(): void {
  if (!isClient()) return
  try {
    localStorage.removeItem(WATCH_HISTORY_STORAGE_KEY)
    notifyChange()
  } catch {
    // Silently fail
  }
}

// Remote sync (syncToRemote / loadFromRemote / triggerBackgroundSync) lives in
// ./service.ts. The merge is performed server-side at POST /api/v1/watch-history/sync
// using last-write-wins on lastWatchedAt; this layer stays as a pure local store.
