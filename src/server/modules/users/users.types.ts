// ============================================
// Users Module — Types
// ============================================

export interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  avatar: string | null
  isActive: boolean
  createdAt: Date
}

export interface UpdateUserInput {
  name?: string
  avatar?: string | null
  role?: string
  isActive?: boolean
}
