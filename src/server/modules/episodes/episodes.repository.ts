// ============================================
// Episodes Module — Repository
// ============================================
// TODO [MIGRATION] Consolidate episode queries from app/api/admin/episodes

import { prisma } from '@/src/server/shared/db/prisma'

export async function findByMovieId(movieId: string) {
  return prisma.episode.findMany({
    where: { movieId, isActive: true },
    orderBy: { episodeOrder: 'asc' },
  })
}

export async function findById(id: string) {
  return prisma.episode.findUnique({ where: { id } })
}
