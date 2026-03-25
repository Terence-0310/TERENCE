// ============================================
// Database Layer — Barrel Export
// ============================================
// Import everything from here:
//   import { prisma, movieScopes, movieIncludes } from '@/lib/db'

export { prisma } from './prisma'
export { movieScopes, movieIncludes, movieOrderBy } from './movie-queries'
export { syncJobScopes, syncJobIncludes, syncLogScopes } from './sync-queries'
export { watchHistoryScopes, watchHistoryIncludes, watchHistoryOrderBy } from './watch-history-queries'
