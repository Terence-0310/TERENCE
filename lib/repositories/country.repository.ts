// ============================================
// Country Repository — Database access layer
// ============================================

import { prisma } from '@/lib/auth/db'

export const countryRepository = {
  /**
   * Get all active countries
   */
  async findAll() {
    return prisma.country.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        code: true,
      },
    })
  },

  /**
   * Get all countries with movie count
   */
  async findAllWithCount() {
    const countries = await prisma.country.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        code: true,
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

    return countries.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      code: c.code,
      movieCount: c._count.movies,
    }))
  },

  /**
   * Find by slug
   */
  async findBySlug(slug: string) {
    return prisma.country.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, code: true },
    })
  },

  /**
   * Find by code
   */
  async findByCode(code: string) {
    return prisma.country.findFirst({
      where: { code, isActive: true },
      select: { id: true, name: true, slug: true, code: true },
    })
  },
}
