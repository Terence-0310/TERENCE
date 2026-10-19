import { NextRequest, NextResponse } from 'next/server'

// ── Edge-compatible inline rate limiter (no Node.js dependencies) ──
const rateLimitStore = new Map<string, { count: number; startMs: number }>()

function edgeRateLimit(key: string, windowMs: number, maxRequests: number): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  
  if (!entry || now - entry.startMs > windowMs) {
    rateLimitStore.set(key, { count: 1, startMs: now })
    return true // allowed
  }
  
  entry.count++
  // Clean up old entries periodically  
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore) {
      if (now - v.startMs > windowMs) rateLimitStore.delete(k)
    }
  }
  
  return entry.count <= maxRequests
}

function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

const PROTECTED_PATHS = ['/dashboard', '/api/admin']

export async function middleware(request: NextRequest) {
  // TỐI ƯU: Bỏ qua (skip) các request prefetch của Next.js
  // Tránh việc hover chuột vào <Link> làm kích hoạt middleware (gây tốn CPU cho getToken hoặc bị rate limit sai)
  if (
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch'
  ) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  
  // Skip NextAuth internal routes — let them pass through without middleware processing
  // NextAuth v4 routes like /api/auth/session, /api/auth/providers, /api/auth/callback/*
  // can crash when getToken() is called in Next.js 16 middleware
  const nextAuthInternalPaths = [
    '/api/auth/session',
    '/api/auth/providers',
    '/api/auth/csrf',
    '/api/auth/signin',
    '/api/auth/signout',
    '/api/auth/error',
    '/api/auth/callback',
    '/api/auth/_log',
  ]
  if (nextAuthInternalPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }
  
  // 1. Rate Limiting cho API Đăng nhập / Đăng ký
  if (
    pathname.includes('/api/auth/callback/credentials') || 
    pathname.startsWith('/api/auth/register') ||
    pathname.startsWith('/api/auth/reset-password') ||
    pathname.startsWith('/api/auth/forgot-password')
  ) {
    const ip = getClientIP(request)
    if (!edgeRateLimit(`auth:${ip}`, 60_000, 5)) {
      return NextResponse.json(
        { error: 'Quá nhiều yêu cầu hệ thống. Vui lòng thử lại sau 1 phút.' }, 
        { status: 429 }
      )
    }
  }

  // 2. Rate Limiting cho API Phim (Lấy nguồn phim, xem lịch sử)
  if (pathname.startsWith('/api/v1/watch-history')) {
    const ip = getClientIP(request)
    if (!edgeRateLimit(`watch:${ip}`, 60_000, 60)) {
      return NextResponse.json(
        { error: 'Dấu hiệu lạm dụng tài nguyên. Vui lòng chậm lại thời gian truy xuất phim.' }, 
        { status: 429 }
      )
    }
  }

  // 3. Dashboard and Admin API route protection
  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  if (isProtected) {
    // Edge-compatible: check for NextAuth session cookie existence
    // The session token cookie name follows NextAuth conventions
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
    
    // NOTE: Detailed role/permission checks are enforced in route handlers
    // and the dashboard layout component, not in middleware.
    // This middleware only ensures the user is authenticated.
  }
  // 4. CSRF Protection cho các tác vụ thay đổi dữ liệu (Mutations)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin') || request.headers.get('referer')
    const isDev = process.env.NODE_ENV !== 'production'
    
    if (origin) {
      try {
        const originUrl = new URL(origin)
        const allowedHosts = ['localhost', 'terence.com.vn', 'www.terence.com.vn']
        
        // Chấp nhận localhost, terence.com.vn và các subdomain của nó
        const isAllowed = allowedHosts.some(host => 
          originUrl.hostname === host || originUrl.hostname.endsWith('.terence.com.vn')
        )
        
        if (!isAllowed) {
          return NextResponse.json({ error: 'CSRF Validation Failed: Origin not allowed' }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ error: 'CSRF Validation Failed: Malformed Origin' }, { status: 403 })
      }
    } else if (!isDev) {
      // Trong môi trường Production, bắt buộc phải có Origin hoặc Referer
      return NextResponse.json({ error: 'CSRF Validation Failed: Missing Origin' }, { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Only match dashboard/admin paths for authentication protection.
     * API route rate limiting has been moved to route handlers directly
     * because Next.js 16's proxy layer causes charCodeAt crashes when
     * middleware intercepts API routes.
     */
    '/dashboard/:path*',
    '/api/admin/:path*',
  ],
}
