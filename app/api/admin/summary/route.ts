import { NextResponse } from 'next/server'
import { AuthService } from '@/src/be/modules/auth'
import { prisma } from '@/src/be/shared/db/prisma'

import { requireAdmin } from '@/src/be/modules/admin/api-helpers'

export async function GET() {
  try {
    const auth = await requireAdmin('dashboard.view')
    if (auth instanceof NextResponse) return auth

    const now = new Date()
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const notDeleted = { deletedAt: null }

    const [
      totalMovies, totalSingleMovies, totalSeries, totalAnime,
      totalUsers, totalAdmins, newUsers7d, newMovies7d,
      draftMovies, publishedMovies, hiddenMovies, archivedMovies,
      blockedUsers, totalEpisodes,
      topMovies, recentUsers,
      missingPoster, brokenSources,
      recentLogs,
    ] = await Promise.all([
      prisma.movie.count({ where: notDeleted }),
      prisma.movie.count({ where: { contentType: 'movie', ...notDeleted } }),
      prisma.movie.count({ where: { contentType: 'tv', ...notDeleted } }),
      prisma.movie.count({ where: { contentType: 'anime', ...notDeleted } }),
      prisma.user.count(),
      prisma.user.count({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } } }),
      prisma.user.count({ where: { createdAt: { gte: d7 } } }),
      prisma.movie.count({ where: { createdAt: { gte: d7 }, ...notDeleted } }),
      prisma.movie.count({ where: { status: 'draft', ...notDeleted } }),
      prisma.movie.count({ where: { status: 'published', ...notDeleted } }),
      prisma.movie.count({ where: { status: 'hidden', ...notDeleted } }),
      prisma.movie.count({ where: { status: 'archived', ...notDeleted } }),
      prisma.user.count({ where: { status: { in: ['banned', 'blocked'] } } }),
      prisma.episode.count(),
      prisma.movie.findMany({
        orderBy: { viewCount: 'desc' }, take: 5,
        where: { status: 'published', ...notDeleted },
        select: { id: true, title: true, viewCount: true, status: true, posterUrl: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.movie.count({ where: { posterUrl: null, ...notDeleted } }),
      prisma.episode.count({ where: { status: 'broken' } }),
      prisma.adminLog.findMany({
        orderBy: { createdAt: 'desc' }, take: 5,
        include: { actor: { select: { name: true, email: true } } },
      }),
    ])

    // Try to get view counts (PageView may or may not have data)
    let viewsToday = 0, views7d = 0
    try {
      [viewsToday, views7d] = await Promise.all([
        prisma.pageView.count({ where: { createdAt: { gte: today } } }),
        prisma.pageView.count({ where: { createdAt: { gte: d7 } } }),
      ])
    } catch {
      // PageView table might be empty or not seeded
    }

    // Total view count from movies
    const totalMovieViews = await prisma.movie.aggregate({ _sum: { viewCount: true }, where: notDeleted })


    const finalStats = [
      { 
        title: 'Tổng số phim', 
        value: totalMovies.toLocaleString(), 
        change: `+${newMovies7d} phim mới tuần này`, 
        trend: 'up' 
      },
      { 
        title: 'Người dùng', 
        value: totalUsers.toLocaleString(), 
        change: `+${newUsers7d} tuần qua`, 
        trend: 'up' 
      },
      { 
        title: 'Lượt xem hôm nay', 
        value: viewsToday.toLocaleString(), 
        change: `0% so với hôm qua`, 
        trend: 'up' 
      },
      { 
        title: 'Doanh thu', 
        value: '0 TCoin', 
        change: '0% so với tháng trước', 
        trend: 'up' 
      },
    ]

    const finalRecentMovies = topMovies.map((m) => ({
      id: m.id, 
      title: m.title, 
      views: m.viewCount,
      status: m.status === 'published' ? 'Đang chiếu' : 'Chờ duyệt',
    }))

    const finalTopUsers = recentUsers.map((u) => ({
      id: u.id, 
      name: u.name, 
      email: u.email, 
      watched: 0 // placeholder cho lịch sử xem
    }))

    return NextResponse.json({
      stats: finalStats,
      recentMovies: finalRecentMovies,
      topUsers: finalTopUsers,
      overview: {
        totalMovies, totalSingleMovies, totalSeries, totalAnime,
        totalUsers, totalAdmins, totalEpisodes,
        newUsers7d, viewsToday, views7d, newMovies7d,
        draftMovies, publishedMovies, hiddenMovies, archivedMovies,
        brokenSources, blockedUsers, missingPoster,
        totalMovieViews: totalMovieViews._sum.viewCount || 0,
      },
    })
  } catch (error) {
    console.error('Admin summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
