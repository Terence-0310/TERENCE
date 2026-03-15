import { getSession } from './session'

export interface PublicUser {
  email: string
  name: string
  role: string
  avatar?: string | null
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const session = await getSession()
  if (!session || !session.user.isActive) return null

  return {
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    avatar: session.user.avatar,
  }
}
