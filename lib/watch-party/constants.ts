// ============================================
// Watch Party — Constants
// ============================================

/** Max room size for each type */
export const ROOM_TYPE_LIMITS = {
  duo: 2,
  small_group: 4,
  group_chat: 50,
} as const

/** Throttle interval for seek sync events (ms) */
export const SEEK_THROTTLE_MS = 1_000

/** Debounce for typing indicator (ms) */
export const TYPING_DEBOUNCE_MS = 2_000

/** Interval for member heartbeat/ping (ms) */
export const HEARTBEAT_INTERVAL_MS = 15_000

/** Max time drift before force-syncing (seconds) */
export const MAX_TIME_DRIFT_SECONDS = 2.0

/** Polling fallback interval if WebSocket unavailable (ms) */
export const POLL_FALLBACK_INTERVAL_MS = 3_000

/** Max recent messages returned */
export const MAX_MESSAGES_RETURNED = 100

/** How many seconds of inactivity before marking member offline */
export const MEMBER_OFFLINE_THRESHOLD_MS = 45_000
