// ============================================
// Analytics Module — Types (Stub)
// ============================================

export interface PageView {
  path: string
  userId?: string
  timestamp: Date
  referrer?: string
}

export interface WatchEvent {
  movieId: string
  episodeId?: string
  userId?: string
  duration: number
  completionRate: number
  timestamp: Date
}

export interface AnalyticsSummary {
  totalPageViews: number
  uniqueUsers: number
  topMovies: Array<{ movieId: string; views: number }>
  averageWatchTime: number
}
