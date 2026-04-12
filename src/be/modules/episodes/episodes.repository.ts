// ============================================
// Episodes Module — Repository
// ============================================

import { prisma } from '@/src/be/shared/db/prisma'
import type { Prisma } from '@prisma/client'

export const EpisodesRepository = {
  async findManyWithCount(where: Prisma.EpisodeWhereInput, skip: number, take: number) {
    return Promise.all([
      prisma.episode.findMany({
        where,
        skip,
        take,
        orderBy: { sortOrder: 'asc' },
        include: { movie: { select: { title: true, slug: true } } },
      }),
      prisma.episode.count({ where }),
    ])
  },

  async findByMovieId(movieId: string) {
    return prisma.episode.findMany({
      where: { movieId, isActive: true },
      orderBy: { episodeOrder: 'asc' },
    })
  },

  async findById(id: string) {
    return prisma.episode.findUnique({
      where: { id },
      include: { movie: { select: { title: true, slug: true } } },
    })
  },

  async create(data: Prisma.EpisodeUncheckedCreateInput) {
    return prisma.episode.create({ data })
  },

  async update(id: string, data: Prisma.EpisodeUncheckedUpdateInput) {
    return prisma.episode.update({ where: { id }, data })
  },

  async delete(id: string) {
    return prisma.episode.delete({ where: { id } })
  }
}
