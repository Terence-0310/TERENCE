// ============================================
// Auth Module — Types
// ============================================

export interface PublicUser {
  email: string
  name: string
  role: string
  avatar?: string | null
}

export interface LoginInput {
  email: string
  password: string
}

export interface SignupInput {
  email: string
  password: string
  name: string
}

export interface LoginResult {
  user: PublicUser
}

export interface SessionData {
  id: string
  userId: string
  user: {
    id: string
    email: string
    name: string
    role: string
    avatar: string | null
    isActive: boolean
  }
  expiresAt: Date
}
