import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ user: null })
    }
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ user: null })
  }
}
