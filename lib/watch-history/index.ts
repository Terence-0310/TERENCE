// ============================================
// Watch History — barrel export
// ============================================

// Types
export type {
  WatchHistoryItem,
  SaveWatchProgressInput,
  ContinueWatchingItem,
} from '@/types/watch-history'

// Constants
export {
  WATCH_HISTORY_STORAGE_KEY,
  MAX_HISTORY_ITEMS,
  COMPLETED_THRESHOLD,
  WATCH_HISTORY_CHANGE_EVENT,
} from './constants'

// Storage layer
export {
  getWatchHistoryFromStorage,
  saveWatchHistoryToStorage,
  upsertWatchHistoryItem,
  removeWatchHistoryItem,
  clearWatchHistory,
} from './storage'

// Service layer
export {
  saveWatchProgress,
  getContinueWatching,
  getLatestWatchedItems,
  getMovieProgress,
  getEpisodeProgress,
  markEpisodeCompleted,
  removeContinueWatching,
  removeMovieHistory,
  clearAllHistory,
  getResumeTime,
} from './service'
