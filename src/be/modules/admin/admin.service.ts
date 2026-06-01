// ============================================
// Admin Module — Service
// ============================================
 

export { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
export {
  movieCreateSchema,
  movieUpdateSchema,
  episodeCreateSchema,
  episodeUpdateSchema,
  shortCreateSchema,
  shortUpdateSchema,
  userCreateSchema,
  userUpdateSchema,
  generateSlug,
} from '@/src/be/modules/admin/validators'

import { prisma } from '@/src/be/shared/db/prisma'

export class AdminService {
  static async getDashboardSummary(selectedDateRange: number = 7) {
    const now = new Date()
    const d7 = new Date(now.getTime() - selectedDateRange * 24 * 60 * 60 * 1000)
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

    let viewsToday = 0, views7d = 0
    let totalRevenue = 0
    
    // Generate structure for the last 7 days chart
    const chartData: any[] = []
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)
      
      chartData.push({
        date: date,
        nextDate: nextDate,
        name: i === 0 ? 'Hôm nay' : dayNames[date.getDay()],
        views: 0,
        revenue: 0
      })
    }

    try {
      const [allViews7d, allTopups7d] = await Promise.all([
        prisma.pageView.findMany({
          where: { createdAt: { gte: chartData[0].date } },
          select: { createdAt: true }
        }),
        prisma.topupOrder.findMany({
          // Paid top-ups use status 'PAID' (set by markOrderPaid). The old
          // 'COMPLETED' filter never matched, so revenue was always 0đ.
          where: { status: 'PAID', createdAt: { gte: chartData[0].date } },
          select: { createdAt: true, amountVnd: true }
        })
      ])
      
      views7d = allViews7d.length
      totalRevenue = allTopups7d.reduce((sum, t) => sum + (t.amountVnd || 0), 0)
      
      for (const v of allViews7d) {
        const day = chartData.find(c => v.createdAt >= c.date && v.createdAt < c.nextDate)
        if (day) day.views++
      }
      for (const t of allTopups7d) {
        const day = chartData.find(c => t.createdAt >= c.date && t.createdAt < c.nextDate)
        if (day) day.revenue += (t.amountVnd || 0)
      }
      
      viewsToday = chartData[chartData.length - 1].views
    } catch {}

    // Clean up unnecessary date objects from chartData before returning
    const finalChartData = chartData.map(d => ({ name: d.name, views: d.views, revenue: d.revenue }))

    const totalMovieViews = await prisma.movie.aggregate({ _sum: { viewCount: true }, where: notDeleted })

    return {
      totalMovies, totalSingleMovies, totalSeries, totalAnime,
      totalUsers, totalAdmins, newUsers7d, newMovies7d,
      draftMovies, publishedMovies, hiddenMovies, archivedMovies,
      blockedUsers, totalEpisodes, topMovies, recentUsers,
      missingPoster, brokenSources, recentLogs, viewsToday, views7d,
      totalMovieViews: totalMovieViews._sum.viewCount || 0,
      totalRevenue,
      chartData: finalChartData
    }
  }
}
