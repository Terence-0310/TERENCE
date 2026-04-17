'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useSession, signIn, signOut, SessionProvider } from 'next-auth/react'

export interface User {
  id?: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'staff' | 'editor' | 'user'
  avatar?: string | null
  isEmailVerified: boolean
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
    id: (session as any).user?.id,
    email: session.user.email || '',
    name: session.user.name || '',
    role: ((session as any).user?.role as any) || 'user',
    avatar: session.user.image,
    isEmailVerified: (session as any).user?.isEmailVerified ?? false,
  } : null

  const isLoading = status === 'loading'

  const login = async (identifier: string, password: string): Promise<boolean> => {
    const res = await signIn('credentials', { email: identifier.trim(), password, redirect: false })
    return !!res?.ok
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
