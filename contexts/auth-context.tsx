'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

// ── Types ──

export interface User {
  email: string
  name: string
  role: 'admin' | 'user'
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (identifier: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  isAdmin: boolean
  isAuthenticated: boolean
}

// ── Constants ──

const STORAGE_KEY = 'terence:auth-user'
const DEMO_DELAY_MS = 800

/** Pre-defined demo accounts (password: any non-empty string) */
const DEMO_ACCOUNTS: Record<string, User> = {
  'admin@terence.vn': { email: 'admin@terence.vn', name: 'Admin Terence', role: 'admin' },
  'user@terence.vn': { email: 'user@terence.vn', name: 'Người dùng Demo', role: 'user' },
}

// ── Context ──

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ── Helpers ──

function loadUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function persistUser(user: User | null): void {
  if (typeof window === 'undefined') return
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

function resolveUser(identifier: string, name?: string): User {
  // Check demo accounts first
  const demo = DEMO_ACCOUNTS[identifier.toLowerCase()]
  if (demo) return demo

  // Fallback: create user from identifier
  const isAdmin = identifier.toLowerCase().includes('admin')
  const displayName = name || identifier.split('@')[0] || 'User'
  return {
    email: identifier,
    name: displayName,
    role: isAdmin ? 'admin' : 'user',
  }
}

/** Simulate async API call */
function simulateDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, DEMO_DELAY_MS))
}

// ── Provider ──

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    setUser(loadUser())
    setIsLoading(false)
  }, [])

  const login = useCallback(async (identifier: string, password: string): Promise<boolean> => {
    if (!identifier.trim() || !password.trim()) return false

    await simulateDelay()
    const resolvedUser = resolveUser(identifier)
    setUser(resolvedUser)
    persistUser(resolvedUser)
    return true
  }, [])

  const signup = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
    if (!name.trim() || !email.trim() || !password.trim()) return false
    if (password.length < 8) return false

    await simulateDelay()
    const newUser = resolveUser(email, name)
    setUser(newUser)
    persistUser(newUser)
    return true
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    persistUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      signup,
      logout,
      isAdmin: user?.role === 'admin',
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
