// ============================================
// Episodes Module — Service
// ============================================

import { EpisodesRepository } from './episodes.repository'
import type { Prisma } from '@prisma/client'

export const EpisodesService = {
  async getPaginatedEpisodes(movieId: string, status: string, skip: number, limit: number) {
    const where: Prisma.EpisodeWhereInput = {}
    if (movieId) where.movieId = movieId
    if (status) where.status = status

    return EpisodesRepository.findManyWithCount(where, skip, limit)
  },

  async getEpisodeById(id: string) {
    return EpisodesRepository.findById(id)
  },

  async createEpisode(data: Prisma.EpisodeUncheckedCreateInput) {
    // Validate movie existence logic can sit here or in controller
    return EpisodesRepository.create(data)
  },

  async updateEpisode(id: string, data: Prisma.EpisodeUncheckedUpdateInput) {
    return EpisodesRepository.update(id, data)
  },

  async deleteEpisode(id: string) {
    return EpisodesRepository.delete(id)
  }
}
