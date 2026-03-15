import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PATHS = ['/dashboard']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect dashboard routes
  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  if (!isProtected) return NextResponse.next()

  // Check for session cookie
  const sessionId = request.cookies.get('terence_session')?.value
  if (!sessionId) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Session exists — allow through (role check done in dashboard layout client-side)
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
