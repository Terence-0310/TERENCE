import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/auth/db'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !['super_admin', 'admin', 'staff', 'editor'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const now = new Date()
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const notDeleted = { deletedAt: null }

    const [
      totalMovies, totalSingleMovies, totalSeries, totalAnime, totalShorts,
      totalUsers, totalAdmins, newUsers7d, newMovies7d,
      draftMovies, publishedMovies, hiddenMovies, archivedMovies,
      blockedUsers, totalEpisodes,
      topMovies, topShorts, recentUsers,
      missingPoster, brokenSources,
      draftShorts, publishedShorts, hiddenShorts,
      recentLogs,
    ] = await Promise.all([
      prisma.movie.count({ where: notDeleted }),
      prisma.movie.count({ where: { contentType: 'movie', ...notDeleted } }),
      prisma.movie.count({ where: { contentType: 'series', ...notDeleted } }),
      prisma.movie.count({ where: { contentType: 'anime', ...notDeleted } }),
      prisma.short.count({ where: { deletedAt: null } }),
      prisma.user.count(),
      prisma.user.count({ where: { role: { in: ['super_admin', 'admin'] } } }),
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
      prisma.short.findMany({
        orderBy: { viewCount: 'desc' }, take: 5,
        where: { status: 'published', deletedAt: null },
        select: { id: true, title: true, viewCount: true, likeCount: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.movie.count({ where: { posterUrl: null, ...notDeleted } }),
      prisma.episode.count({ where: { status: 'broken' } }),
      prisma.short.count({ where: { status: 'draft', deletedAt: null } }),
      prisma.short.count({ where: { status: 'published', deletedAt: null } }),
      prisma.short.count({ where: { status: 'hidden', deletedAt: null } }),
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
    const totalShortViews = await prisma.short.aggregate({ _sum: { viewCount: true }, where: { deletedAt: null } })

    return NextResponse.json({
      stats: [
        { title: 'Tổng số phim', value: totalMovies.toLocaleString(), change: `+${newMovies7d} tuần`, trend: 'up' },
        { title: 'Người dùng', value: totalUsers.toLocaleString(), change: `+${newUsers7d} tuần`, trend: 'up' },
        { title: 'Lượt xem hôm nay', value: viewsToday.toLocaleString(), change: `${views7d.toLocaleString()} /7d`, trend: 'up' },
        { title: 'Short Video', value: totalShorts.toLocaleString(), change: `${publishedShorts} xuất bản`, trend: 'up' },
      ],
      overview: {
        totalMovies, totalSingleMovies, totalSeries, totalAnime, totalShorts,
        totalUsers, totalAdmins, totalEpisodes,
        newUsers7d, viewsToday, views7d, newMovies7d,
        draftMovies, publishedMovies, hiddenMovies, archivedMovies,
        draftShorts, publishedShorts, hiddenShorts,
        brokenSources, blockedUsers, missingPoster,
        totalMovieViews: totalMovieViews._sum.viewCount || 0,
        totalShortViews: totalShortViews._sum.viewCount || 0,
      },
      recentMovies: topMovies.map((m, i) => ({
        id: i + 1, title: m.title, views: m.viewCount,
        status: m.status === 'published' ? 'Đang chiếu' : m.status,
        posterUrl: m.posterUrl,
      })),
      topUsers: recentUsers.map((u) => ({
        id: u.id, name: u.name, email: u.email, role: u.role,
        joined: u.createdAt,
      })),
      topShorts: topShorts.map((s) => ({
        id: s.id, title: s.title, views: s.viewCount, likes: s.likeCount,
      })),
      recentLogs: recentLogs.map((l) => ({
        id: l.id, action: l.action, targetType: l.targetType,
        actor: l.actor.name, createdAt: l.createdAt,
        metadata: l.metadata ? JSON.parse(l.metadata) : null,
      })),
    })
  } catch (error) {
    console.error('Admin summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
