// ============================================
// Admin Module — Types
// ============================================

export interface AdminSummary {
  totalMovies: number
  totalUsers: number
  totalEpisodes: number
  totalViews: number
}

export interface AdminGuardResult {
  authorized: boolean
  user?: {
    email: string
    name: string
    role: string
  }
  error?: string
}
