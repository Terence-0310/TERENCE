import { NextRequest, NextResponse } from 'next/server'

// Proxy (Next.js 16, formerly middleware) guarding the admin surface (/dashboard, /api/admin):
//   1. Requires a NextAuth session cookie (detailed role/permission checks
//      live in the route handlers and the dashboard layout).
//   2. CSRF origin check on mutations.
// Rate limiting is done inside the route handlers (see src/be/shared/rate-limit.ts),
// because the matcher below deliberately keeps the proxy off the public API.

// Built-in hosts plus the ones the deployment declares, so a self-hosted
// domain (e.g. on Oracle Cloud) passes the CSRF check without a code change.
const ALLOWED_HOSTS = new Set(['localhost', 'terence.com.vn', 'www.terence.com.vn'])
for (const url of [
  process.env.NEXTAUTH_URL,
  process.env.APP_URL,
  process.env.NEXT_PUBLIC_SITE_URL,
  ...(process.env.ALLOWED_ORIGINS?.split(',') ?? []),
]) {
  try {
    if (url?.trim()) ALLOWED_HOSTS.add(new URL(url.trim()).hostname)
  } catch {
    // ignore malformed entries
  }
}

export async function proxy(request: NextRequest) {
  // Skip Next.js prefetches so hovering a <Link> doesn't hit the guard.
  if (
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch'
  ) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  // 1. Authentication — cookie presence only (full session/role checks happen downstream).
  const sessionToken = request.cookies.get('next-auth.session-token')?.value
    || request.cookies.get('__Secure-next-auth.session-token')?.value

  if (!sessionToken) {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 2. CSRF protection for mutations.
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin') || request.headers.get('referer')

    if (origin) {
      try {
        const { hostname } = new URL(origin)
        const isAllowed = ALLOWED_HOSTS.has(hostname) || hostname.endsWith('.terence.com.vn')
        if (!isAllowed) {
          return NextResponse.json({ error: 'CSRF Validation Failed: Origin not allowed' }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ error: 'CSRF Validation Failed: Malformed Origin' }, { status: 403 })
      }
    } else if (process.env.NODE_ENV === 'production') {
      // Production requires an Origin or Referer header.
      return NextResponse.json({ error: 'CSRF Validation Failed: Missing Origin' }, { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*'],
}
