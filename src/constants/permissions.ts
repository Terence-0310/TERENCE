export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
  
  // Movies
  MOVIE_READ: 'movie.read',
  MOVIE_CREATE: 'movie.create',
  MOVIE_UPDATE: 'movie.update',
  MOVIE_DELETE: 'movie.delete',
  MOVIE_PUBLISH: 'movie.publish',

  // Episodes
  EPISODE_READ: 'episode.read',
  EPISODE_CREATE: 'episode.create',
  EPISODE_UPDATE: 'episode.update',
  EPISODE_DELETE: 'episode.delete',

  // Reviews
  REVIEW_READ: 'review.read',
  REVIEW_MODERATE: 'review.moderate',
  REVIEW_CREATE: 'review.create',

  // Users
  USER_READ: 'user.read',
  USER_UPDATE: 'user.update',
  USER_BLOCK: 'user.block',
  USER_ROLE_UPDATE: 'user.role.update',
  USER_PROFILE_READ: 'profile.read',
  USER_PROFILE_UPDATE: 'profile.update',

  // System
  PAYMENT_READ: 'payment.read',
  PAYMENT_UPDATE: 'payment.update',
  ADMINLOG_READ: 'adminlog.read',
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',

  // Generic
  WATCH_HISTORY_READ: 'watch-history.read',
  WATCH_HISTORY_UPDATE: 'watch-history.update',
} as const

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS]

export const PERMISSION_LIST = Object.values(PERMISSIONS)
