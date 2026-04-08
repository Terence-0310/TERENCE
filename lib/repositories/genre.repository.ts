// ============================================
// Genre Repository — Database access layer
// ============================================

import { prisma } from '@/lib/auth/db'

export const genreRepository = {
  /**
   * Get all active genres ordered by sortOrder
   */
  async findAll() {
    return prisma.genre.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        tmdbId: true,
        description: true,
        sortOrder: true,
      },
    })
  },

  /**
   * Get all genres with movie count
   */
  async findAllWithCount() {
    const genres = await prisma.genre.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        tmdbId: true,
        description: true,
        _count: {
          select: {
            movies: {
              where: {
                movie: { isActive: true, isPublished: true, deletedAt: null },
              },
            },
          },
        },
      },
    })

    return genres.map(g => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      tmdbId: g.tmdbId,
      description: g.description,
      movieCount: g._count.movies,
    }))
  },

  /**
   * Find genre by slug
   */
  async findBySlug(slug: string) {
    return prisma.genre.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        tmdbId: true,
        description: true,
      },
    })
  },

  /**
   * Find genre by id
   */
  async findById(id: string) {
    return prisma.genre.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        tmdbId: true,
        description: true,
      },
    })
  },
}
