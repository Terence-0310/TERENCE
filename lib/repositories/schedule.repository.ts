// ============================================
// Schedule Repository — Database access layer
// ============================================
// For series episode release schedule based on actual DB data.

import { prisma } from '@/lib/auth/db'

export const scheduleRepository = {
  /**
   * Get episodes updated on a specific date (release schedule)
   */
  async findByDate(dateStr: string, limit = 50) {
    const startOfDay = new Date(dateStr + 'T00:00:00.000Z')
    const endOfDay = new Date(dateStr + 'T23:59:59.999Z')

    return prisma.episode.findMany({
      where: {
        isActive: true,
        updatedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        movie: {
          isActive: true,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        episodeName: true,
        episodeNumber: true,
        title: true,
        thumbnailUrl: true,
        updatedAt: true,
        movie: {
          select: {
            id: true,
            slug: true,
            title: true,
            posterUrl: true,
            thumbUrl: true,
            contentType: true,
            episodeCurrent: true,
            episodeTotal: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
  },

  /**
   * Get the latest episode updates across all series (last N days)
   */
  async findRecent(days = 7, limit = 30) {
    const since = new Date()
    since.setDate(since.getDate() - days)

    return prisma.episode.findMany({
      where: {
        isActive: true,
        updatedAt: { gte: since },
        movie: {
          isActive: true,
          deletedAt: null,
          contentType: { in: ['series', 'anime'] },
        },
      },
      select: {
        id: true,
        episodeName: true,
        episodeNumber: true,
        title: true,
        thumbnailUrl: true,
        updatedAt: true,
        movie: {
          select: {
            id: true,
            slug: true,
            title: true,
            posterUrl: true,
            thumbUrl: true,
            contentType: true,
            episodeCurrent: true,
            episodeTotal: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
  },

  /**
   * Get available dates that have episode updates (for calendar nav)
   */
  async findAvailableDates(days = 14) {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const episodes = await prisma.episode.findMany({
      where: {
        isActive: true,
        updatedAt: { gte: since },
        movie: { isActive: true, deletedAt: null },
      },
      select: { updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })

    // Extract unique dates
    const dates = new Set<string>()
    for (const ep of episodes) {
      dates.add(ep.updatedAt.toISOString().split('T')[0])
    }

    return Array.from(dates).sort().reverse()
  },
}
