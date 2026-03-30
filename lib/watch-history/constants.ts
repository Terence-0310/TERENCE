// ============================================
// Watch History — Constants
// ============================================

/** localStorage key for the unified watch history array */
export const WATCH_HISTORY_STORAGE_KEY = 'terence:watch-history'

/** Maximum number of history items kept in localStorage */
export const MAX_HISTORY_ITEMS = 100

/** Progress percentage at or above which an episode is "completed" */
export const COMPLETED_THRESHOLD = 90

/** Minimum seconds watched before saving a record */
export const MIN_SECONDS_TO_SAVE = 5

/** Minimum progress % to appear in "continue watching" */
export const MIN_PROGRESS_TO_SHOW = 2

/** Maximum progress % to appear in "continue watching" (exclude completed) */
export const MAX_PROGRESS_TO_SHOW = 95

/** Custom event name dispatched when history changes (cross-component sync) */
export const WATCH_HISTORY_CHANGE_EVENT = 'terence:watch-history-changed'
