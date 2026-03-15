// ============================================
// Watch Progress — localStorage persistence for resume playback
// ============================================
// Client-side only — all functions check for `window` before accessing localStorage

const STORAGE_KEY = 'terence:watch-progress'
const MAX_ENTRIES = 100

export interface SavedProgress {
  movieId: number
  episodeId?: string
  currentTime: number
  duration: number
  percentage: number
  updatedAt: string
}

/** Get all saved progress entries */
function getAll(): Record<string, SavedProgress> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/** Save all entries back to storage */
function saveAll(entries: Record<string, SavedProgress>) {
  if (typeof window === 'undefined') return
  try {
    // Evict oldest if over limit
    const keys = Object.keys(entries)
    if (keys.length > MAX_ENTRIES) {
      const sorted = keys.sort(
        (a, b) => new Date(entries[a].updatedAt).getTime() - new Date(entries[b].updatedAt).getTime(),
      )
      for (let i = 0; i < keys.length - MAX_ENTRIES; i++) {
        delete entries[sorted[i]]
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Storage full or unavailable — silently fail
  }
}

/** Build a storage key for a movie + optional episode */
function buildKey(movieId: number, episodeId?: string): string {
  return episodeId ? `${movieId}:${episodeId}` : `${movieId}`
}

/**
 * Save watch progress for a movie/episode.
 * Called periodically during playback (e.g. every 5 seconds).
 */
export function saveWatchProgress(
  movieId: number,
  currentTime: number,
  duration: number,
  episodeId?: string,
): void {
  if (duration <= 0 || currentTime < 0) return

  const percentage = Math.round((currentTime / duration) * 100)
  // Don't save if completed (>= 95%) or barely started (< 5 seconds)
  if (percentage >= 95 || currentTime < 5) return

  const entries = getAll()
  entries[buildKey(movieId, episodeId)] = {
    movieId,
    episodeId,
    currentTime,
    duration,
    percentage,
    updatedAt: new Date().toISOString(),
  }
  saveAll(entries)
}

/**
 * Get saved progress for a movie/episode.
 * Returns null if no progress saved or if already completed.
 */
export function getWatchProgress(movieId: number, episodeId?: string): SavedProgress | null {
  const entries = getAll()
  const entry = entries[buildKey(movieId, episodeId)]
  if (!entry) return null
  // If progress is very small or very large, ignore
  if (entry.currentTime < 10 || entry.percentage >= 95) return null
  return entry
}

/**
 * Clear saved progress for a movie/episode.
 */
export function clearWatchProgress(movieId: number, episodeId?: string): void {
  const entries = getAll()
  delete entries[buildKey(movieId, episodeId)]
  saveAll(entries)
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}
