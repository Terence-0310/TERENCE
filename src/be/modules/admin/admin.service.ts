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

    let viewsToday = 0, views7d = 0
    try {
      [viewsToday, views7d] = await Promise.all([
        prisma.pageView.count({ where: { createdAt: { gte: today } } }),
        prisma.pageView.count({ where: { createdAt: { gte: d7 } } }),
      ])
    } catch {}

    const totalMovieViews = await prisma.movie.aggregate({ _sum: { viewCount: true }, where: notDeleted })

    return {
      totalMovies, totalSingleMovies, totalSeries, totalAnime,
      totalUsers, totalAdmins, newUsers7d, newMovies7d,
      draftMovies, publishedMovies, hiddenMovies, archivedMovies,
      blockedUsers, totalEpisodes, topMovies, recentUsers,
      missingPoster, brokenSources, recentLogs, viewsToday, views7d,
      totalMovieViews: totalMovieViews._sum.viewCount || 0
    }
  }
}
