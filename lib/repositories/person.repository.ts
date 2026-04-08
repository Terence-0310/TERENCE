// ============================================
// Person (Actor/Director) Repository
// ============================================

import { prisma } from '@/lib/auth/db'

export const personRepository = {
  /**
   * Get popular people
   */
  async findPopular(page: number, limit: number) {
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      prisma.person.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          originalName: true,
          profileUrl: true,
          knownFor: true,
          popularity: true,
          _count: {
            select: { movies: true },
          },
        },
        orderBy: { popularity: 'desc' },
        skip,
        take: limit,
      }),
      prisma.person.count({ where: { isActive: true } }),
    ])

    return {
      data: data.map(p => ({
        ...p,
        movieCount: p._count.movies,
        _count: undefined,
      })),
      total,
      page,
      limit,
    }
  },

  /**
   * Get person detail with their movies
   */
  async findBySlug(slug: string) {
    return prisma.person.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        originalName: true,
        profileUrl: true,
        biography: true,
        birthDate: true,
        deathDate: true,
        gender: true,
        knownFor: true,
        popularity: true,
        movies: {
          where: { isActive: true, movie: { isActive: true, deletedAt: null } },
          orderBy: { sortOrder: 'asc' },
          include: {
            movie: {
              select: {
                id: true,
                slug: true,
                title: true,
                posterUrl: true,
                year: true,
                rating: true,
                contentType: true,
              },
            },
          },
        },
      },
    })
  },

  /**
   * Search people by name
   */
  async search(query: string, limit = 10) {
    return prisma.person.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } as any },
          { originalName: { contains: query, mode: 'insensitive' } as any },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        profileUrl: true,
        knownFor: true,
      },
      orderBy: { popularity: 'desc' },
      take: limit,
    })
  },
}
