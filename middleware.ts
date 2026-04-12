import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIdentifier } from '@/src/be/shared/rate-limit'
import { getToken } from 'next-auth/jwt'

const PROTECTED_PATHS = ['/dashboard']

// Global Rate Limiters for Middleware
const authLimiter = rateLimit({ windowMs: 60_000, maxRequests: 5 }) // 5 requests per minute for auth
const watchLimiter = rateLimit({ windowMs: 60_000, maxRequests: 60 }) // 60 requests per minute for watching actions

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 1. Rate Limiting cho API Đăng nhập / Đăng ký
  if (
    pathname.includes('/api/auth/callback/credentials') || 
    pathname.startsWith('/api/auth/register') ||
    pathname.startsWith('/api/auth/reset-password') ||
    pathname.startsWith('/api/auth/forgot-password')
  ) {
    const ip = getClientIdentifier(request)
    const result = authLimiter.check(ip)
    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Quá nhiều yêu cầu hệ thống. Vui lòng thử lại sau 1 phút.' }, 
        { status: 429 }
      )
    }
  }

  // 2. Rate Limiting cho API Phim (Lấy nguồn phim, xem lịch sử)
  if (pathname.startsWith('/api/v1/watch-history')) {
    const ip = getClientIdentifier(request)
    const result = watchLimiter.check(ip)
    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Dấu hiệu lạm dụng tài nguyên. Vui lòng chậm lại thời gian truy xuất phim.' }, 
        { status: 429 }
      )
    }
  }

  // 3. Dashboard route protection
  // 3. Dashboard route protection
  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  if (isProtected) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // Check roles natively, but mostly enforce at least one dashboard-level permission
    const role = (token as any).role?.toUpperCase() || ''
    const permissions = ((token as any).permissions || []) as string[]
    
    // Bypass for SUPER_ADMIN
    if (role !== 'SUPER_ADMIN') {
       // Must have at least one of these permissions to even enter dashboard
       const hasDashboardAccess = permissions.some(p => [
         'dashboard.view', 'movie.read', 'user.read', 'payment.read', 'review.read', 'settings.read'
       ].includes(p))

       if (!hasDashboardAccess) {
          const homeUrl = new URL('/?error=unauthorized', request.url)
          return NextResponse.redirect(homeUrl)
       }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Khớp với các path bắt đầu bằng:
     * - /dashboard
     * - /api/auth/login
     * - /api/auth/signup
     * - /api/v1/watch-history
     */
    '/dashboard/:path*',
    '/api/auth/:path*',
    '/api/v1/watch-history/:path*'
  ],
}
