import { NextRequest } from 'next/server'
import { requireAdmin, parsePagination } from '@/src/be/modules/admin/api-helpers'
import { AdminService } from '@/src/be/modules/admin/admin.service'
import { prisma } from '@/src/be/shared/db/prisma'
import { ok, serverError, paginated } from '@/src/be/shared/api-handler'

export class AdminController {
  // GET /api/admin/summary
  static async getSummary() {
    try {
      const auth = await requireAdmin('dashboard.view')
      if (auth instanceof Response) return auth

      const stats = await AdminService.getDashboardSummary()

      const finalStats = [
        { 
          title: 'Tổng số phim', 
          value: stats.totalMovies.toLocaleString(), 
          change: `+${stats.newMovies7d} phim mới tuần này`, 
          trend: 'up' 
        },
        { 
          title: 'Người dùng', 
          value: stats.totalUsers.toLocaleString(), 
          change: `+${stats.newUsers7d} tuần qua`, 
          trend: 'up' 
        },
        { 
          title: 'Lượt xem hôm nay', 
          value: stats.viewsToday.toLocaleString(), 
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

      const finalRecentMovies = stats.topMovies.map((m) => ({
        id: m.id, 
        title: m.title, 
        views: m.viewCount,
        status: m.status === 'published' ? 'Đang chiếu' : 'Chờ duyệt',
      }))

      const finalTopUsers = stats.recentUsers.map((u) => ({
        id: u.id, 
        name: u.name, 
        email: u.email, 
        watched: 0
      }))

      return ok({
        stats: finalStats,
        recentMovies: finalRecentMovies,
        topUsers: finalTopUsers,
        overview: {
          totalMovies: stats.totalMovies, totalSingleMovies: stats.totalSingleMovies, totalSeries: stats.totalSeries, totalAnime: stats.totalAnime,
          totalUsers: stats.totalUsers, totalAdmins: stats.totalAdmins, totalEpisodes: stats.totalEpisodes,
          newUsers7d: stats.newUsers7d, viewsToday: stats.viewsToday, views7d: stats.views7d, newMovies7d: stats.newMovies7d,
          draftMovies: stats.draftMovies, publishedMovies: stats.publishedMovies, hiddenMovies: stats.hiddenMovies, archivedMovies: stats.archivedMovies,
          brokenSources: stats.brokenSources, blockedUsers: stats.blockedUsers, missingPoster: stats.missingPoster,
          totalMovieViews: stats.totalMovieViews,
        },
      })
    } catch (error) {
      console.error('Admin summary error:', error)
      return serverError()
    }
  }

  // GET /api/admin/reports
  static async getReports() {
    try {
      const auth = await requireAdmin('reports.view')
      if (auth instanceof Response) return auth

      const notDeleted = { deletedAt: null }
      const select = { id: true, title: true, slug: true, status: true, createdAt: true }

      const [
        moviesMissingPoster, moviesMissingDescription, moviesMissingSource,
        brokenEpisodes,
        draftMovies,
        blockedUsers, totalUploads,
        archivedMovies, unpublishedMovies,
        recentlyUpdated, totalActive,
      ] = await Promise.all([
        prisma.movie.count({ where: { posterUrl: null, ...notDeleted } }),
        prisma.movie.count({ where: { description: null, ...notDeleted } }),
        prisma.movie.findMany({
          where: { sourceStatus: { in: ['missing', 'broken'] }, ...notDeleted },
          select, take: 50,
        }),
        prisma.episode.findMany({
          where: { status: 'broken' }, take: 50,
          select: {
            id: true, movieId: true, episodeNumber: true, sourceUrl: true,
            movie: { select: { title: true } },
          },
        }),
        prisma.movie.findMany({
          where: { status: 'draft', ...notDeleted }, take: 20,
          select: { ...select, updatedAt: true },
        }),
        prisma.user.findMany({
          where: { status: { in: ['banned', 'blocked'] } }, take: 20,
          select: { id: true, name: true, email: true, blockedReason: true },
        }),
        prisma.upload.count(),
        prisma.movie.count({ where: { status: 'archived', ...notDeleted } }),
        prisma.movie.count({ where: { status: { not: 'published' }, ...notDeleted } }),
        prisma.movie.findMany({
          where: notDeleted, orderBy: { updatedAt: 'desc' },
          select: { ...select, updatedAt: true, updatedBy: true }, take: 10,
        }),
        prisma.movie.count({ where: notDeleted }),
      ])

      // Duplicate slug check
      const allSlugs = await prisma.movie.findMany({
        where: notDeleted,
        select: { id: true, slug: true, title: true },
      })
      const duplicateSlugCandidates: Array<{ slug: string; titles: string[] }> = []
      const slugMap = new Map<string, string[]>()
      for (const m of allSlugs) {
        const base = m.slug.replace(/-\d+$/, '')
        if (!slugMap.has(base)) slugMap.set(base, [])
        slugMap.get(base)!.push(m.title)
      }
      for (const [slug, titles] of slugMap) {
        if (titles.length > 1) duplicateSlugCandidates.push({ slug, titles })
      }

      return ok({
        warnings: [
          { type: 'movies_missing_poster', count: moviesMissingPoster, label: 'Phim thiếu poster' },
          { type: 'movies_missing_description', count: moviesMissingDescription, label: 'Phim thiếu mô tả' },
          { type: 'movies_broken_source', count: moviesMissingSource.length, label: 'Phim thiếu/lỗi nguồn phát', items: moviesMissingSource },
          { type: 'broken_episodes', count: brokenEpisodes.length, label: 'Tập phim lỗi nguồn', items: brokenEpisodes },
          { type: 'duplicate_slugs', count: duplicateSlugCandidates.length, label: 'Slug trùng lấp', items: duplicateSlugCandidates },
          { type: 'draft_movies', count: draftMovies.length, label: 'Phim chờ duyệt', items: draftMovies },
          { type: 'blocked_users', count: blockedUsers.length, label: 'User bị khóa', items: blockedUsers },
        ],
        summary: {
          unpublishedMovies,
          archivedMovies,
          totalActive,
          totalUploads,
        },
        recentlyUpdatedMovies: recentlyUpdated,
      })
    } catch (error) {
      console.error('Admin reports error:', error)
      return serverError()
    }
  }

  // GET /api/admin/logs
  static async getLogs(req: NextRequest) {
    try {
      const auth = await requireAdmin('logs.view')
      if (auth instanceof Response) return auth

      const sp = req.nextUrl.searchParams
      const { page, limit, skip } = parsePagination(sp)

      // Filters
      const action = sp.get('action') || ''
      const targetType = sp.get('targetType') || ''
      const actorId = sp.get('actorId') || ''
      const dateFrom = sp.get('dateFrom') || ''
      const dateTo = sp.get('dateTo') || ''
      const search = sp.get('search') || ''

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {}

      if (action) where.action = action
      if (targetType) where.resource = targetType
      if (actorId) where.actorId = actorId

      // Date range filter
      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = new Date(dateFrom)
        if (dateTo) {
          const end = new Date(dateTo)
          end.setHours(23, 59, 59, 999)
          where.createdAt.lte = end
        }
      }

      // Search in metadata (contains)
      if (search) {
        where.OR = [
          { metadataJson: { contains: search } },
          { resourceId: { contains: search } },
          { actor: { name: { contains: search } } },
          { actor: { email: { contains: search } } },
        ]
      }

      const [data, total] = await Promise.all([
        prisma.adminLog.findMany({
          where, skip, take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            actor: { select: { name: true, email: true, role: true, avatar: true } },
          },
        }),
        prisma.adminLog.count({ where }),
      ])

      const parsedData = data.map(log => ({
        ...log,
        metadata: log.metadataJson ? JSON.parse(log.metadataJson) : null,
        targetType: log.resource,
        targetId: log.resourceId,
      }))

      return paginated(parsedData, total, page, limit)
    } catch (error) {
      console.error('Admin logs error:', error)
      return serverError()
    }
  }
}
