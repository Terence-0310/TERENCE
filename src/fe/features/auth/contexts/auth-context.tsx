'use client'

import { createContext, useContext, ReactNode, useEffect } from 'react'
import { useSession, signIn, signOut, SessionProvider } from 'next-auth/react'
import { loadFromRemote, syncToRemote } from '@/lib/watch-history/service'

export interface User {
  id?: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'staff' | 'editor' | 'user'
  avatar?: string | null
  isEmailVerified: boolean
  /** Effective permission keys (see src/constants/permissions.ts) */
  permissions: string[]
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (identifier: string, password: string) => Promise<LoginResult>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  isAdmin: boolean
  isAuthenticated: boolean
}

export interface LoginResult {
  ok: boolean
  /** User-facing reason when ok is false. */
  error?: string
}

// authorize() in lib/auth.ts throws these; only surface the ones that are safe
// to show (never reveal whether an email exists).
const SAFE_LOGIN_ERRORS = [
  'Tài khoản đã bị khóa',
  'Vui lòng đăng nhập bằng Google',
  'Quá nhiều lần đăng nhập, vui lòng thử lại sau 1 phút',
]

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextInner>{children}</AuthContextInner>
    </SessionProvider>
  )
}

function AuthContextInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()

  const user: User | null = session?.user ? {
    id: session.user.id,
    email: session.user.email || '',
    name: session.user.name || '',
    role: (session.user.role as User['role']) || 'user',
    avatar: session.user.image,
    isEmailVerified: session.user.isEmailVerified ?? false,
    permissions: session.user.permissions ?? [],
  } : null

  useEffect(() => {
    if (status === 'authenticated' && user?.id) {
      loadFromRemote().then(() => {
        syncToRemote().catch(() => {})
      }).catch(() => {})
    }
  }, [status, user?.id])

  const isLoading = status === 'loading'


  const login = async (identifier: string, password: string): Promise<LoginResult> => {
    const res = await signIn('credentials', { email: identifier.trim(), password, redirect: false })
    if (res?.ok) return { ok: true }
    const error = SAFE_LOGIN_ERRORS.find((m) => res?.error === m) ?? 'Thông tin đăng nhập không chính xác'
    return { ok: false, error }
  }

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    // Custom register route
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
    })
    if (!res.ok) return false
    
    // Auto login after successful signup
    const loginRes = await signIn('credentials', { email: email.trim(), password, redirect: false })
    return !!loginRes?.ok
  }

  const logout = () => {
    signOut({ redirect: true, callbackUrl: '/login' })
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      signup,
      logout,
      isAdmin: !!user && ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'EDITOR'].includes(user.role.toUpperCase()),
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
