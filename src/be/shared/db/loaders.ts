import DataLoader from 'dataloader'
import { prisma } from './prisma'
import { cache } from 'react'

// ============================================
// Database DataLoaders
// ============================================
// React cache() ensures that the DataLoader instance is created exactly once per request.
// This allows DataLoader to efficiently batch multiple findUnique() calls happening 
// concurrently into a single findMany(IN [id1, id2, ...]) DB query, eliminating N+1 issues.

/**
 * Request-scoped DataLoader cho User.
 * Gộp các request tìm User theo ID.
 */
export const getUserLoader = cache(() => {
  return new DataLoader(async (ids: readonly string[]) => {
    const users = await prisma.user.findMany({
      where: { id: { in: [...ids] } },
    })
    const userMap = new Map(users.map(u => [u.id, u]))
    // DataLoader requires the returned array to have the same length and order as the keys.
    return ids.map(id => userMap.get(id) || null)
  })
})

/**
 * Request-scoped DataLoader cho Movie.
 * Gộp các request tìm Movie theo ID.
 */
export const getMovieLoader = cache(() => {
  return new DataLoader(async (ids: readonly string[]) => {
    const movies = await prisma.movie.findMany({
      where: { id: { in: [...ids] } },
    })
    const movieMap = new Map(movies.map(m => [m.id, m]))
    return ids.map(id => movieMap.get(id) || null)
  })
})

/**
 * Request-scoped DataLoader cho Episode.
 * Gộp các request tìm Episode theo ID.
 */
export const getEpisodeLoader = cache(() => {
  return new DataLoader(async (ids: readonly string[]) => {
    const episodes = await prisma.episode.findMany({
      where: { id: { in: [...ids] } },
    })
    const epMap = new Map(episodes.map(e => [e.id, e]))
    return ids.map(id => epMap.get(id) || null)
  })
})
