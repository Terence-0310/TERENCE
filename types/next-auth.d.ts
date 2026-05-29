// Module augmentation for next-auth — exposes the custom fields we attach
// in jwt() and session() callbacks (see lib/auth.ts) so consumers can read
// session.user.id without `as any` casts.

import type { DefaultSession, DefaultUser } from 'next-auth'
import type { DefaultJWT } from 'next-auth/jwt'

type TerenceRole = 'USER' | 'EDITOR' | 'ADMIN' | string

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: TerenceRole
      isActive: boolean
      isEmailVerified: boolean
      permissions: string[]
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role?: TerenceRole
    isActive?: boolean
    isEmailVerified?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    role: TerenceRole
    isActive: boolean
    isEmailVerified: boolean
    permissions: string[]
  }
}
