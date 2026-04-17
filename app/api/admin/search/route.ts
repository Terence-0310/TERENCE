// ============================================
// Admin Search API — Unified dashboard search
// ============================================
// Searches across movies, users, and returns quick-nav items.
//
// GET /api/admin/search?q=keyword
//   Returns categorized results: movies, users, pages

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin } from '@/src/be/modules/admin/api-helpers'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin('dashboard.view')
    if (auth instanceof NextResponse) return auth

    const q = req.nextUrl.searchParams.get('q')?.trim()
    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: { movies: [], users: [], pages: [] } })
    }

    const searchTerm = `%${q}%`

    // Search movies and users in parallel
    const [movies, users] = await Promise.all([
      prisma.movie.findMany({
        where: {
          deletedAt: null,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { originalTitle: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          slug: true,
          contentType: true,
          status: true,
          posterUrl: true,
          year: true,
        },
      }),

      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
        },
      }),
    ])

    // Quick-nav pages matching the query
    const pages = getMatchingPages(q)

    return NextResponse.json({
      success: true,
      data: {
        movies: movies.map(m => ({
          id: m.id,
          title: m.title,
          slug: m.slug,
          type: m.contentType,
          status: m.status,
          poster: m.posterUrl,
          year: m.year,
          href: `/dashboard/movies/${m.id}`,
        })),
        users: users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          href: `/dashboard/users?search=${encodeURIComponent(u.email)}`,
        })),
        pages,
      },
    })
  } catch (error) {
    console.error('Admin search error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// ── Quick-nav page matching ──

interface QuickPage {
  title: string
  href: string
  icon: string // icon name for client-side rendering
}

function getMatchingPages(query: string): QuickPage[] {
  const q = query.toLowerCase()
  const ALL_PAGES: QuickPage[] = [
    { title: 'Tổng quan Dashboard', href: '/dashboard', icon: 'dashboard' },
    { title: 'Quản lý phim', href: '/dashboard/movies', icon: 'film' },
    { title: 'Thêm phim mới', href: '/dashboard/movies/new', icon: 'film' },
    { title: 'Nội dung (Thể loại, Quốc gia)', href: '/dashboard/content', icon: 'tag' },
    { title: 'Quản lý người dùng', href: '/dashboard/users', icon: 'users' },
    { title: 'Thanh toán & TCoin', href: '/dashboard/tcoin', icon: 'coins' },
    { title: 'Thống kê Analytics', href: '/dashboard/analytics', icon: 'chart' },
    { title: 'Nhật ký hệ thống', href: '/dashboard/logs', icon: 'log' },
    { title: 'Cài đặt hệ thống', href: '/dashboard/settings', icon: 'settings' },
  ]

  return ALL_PAGES.filter(p => p.title.toLowerCase().includes(q)).slice(0, 3)
}
