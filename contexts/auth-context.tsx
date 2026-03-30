'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

// ── Types ──

export interface User {
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'staff' | 'editor' | 'user'
  avatar?: string | null
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

// ── Context ──

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ── Provider ──

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session on mount via /api/auth/me
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data: { user: User | null }) => {
        setUser(data.user ?? null)
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (identifier: string, password: string): Promise<boolean> => {
    if (!identifier.trim() || !password.trim()) return false

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier.trim(), password }),
      })

      if (!res.ok) return false

      const data = await res.json() as { user: User }
      setUser(data.user)
      return true
    } catch {
      return false
    }
  }, [])

  const signup = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
    if (!name.trim() || !email.trim() || !password.trim()) return false
    if (password.length < 8) return false

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      })

      if (!res.ok) return false

      const data = await res.json() as { user: User }
      setUser(data.user)
      return true
    } catch {
      return false
    }
  }, [])

  const logout = useCallback(() => {
    fetch('/api/auth/logout', { method: 'POST' })
      .catch(() => {})
      .finally(() => setUser(null))
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      signup,
      logout,
      isAdmin: !!user && ['super_admin', 'admin', 'staff', 'editor'].includes(user.role),
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
