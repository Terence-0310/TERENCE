// ============================================
// Repositories — Barrel Export
// ============================================
// All database access goes through repositories.
// Components/pages/API routes should NOT use prisma directly.
//
// Usage:
//   import { movieRepository, genreRepository } from '@/lib/repositories'

export { movieRepository } from './movie.repository'
export { genreRepository } from './genre.repository'
export { countryRepository } from './country.repository'
export { personRepository } from './person.repository'
export { reviewRepository } from './review.repository'
export { scheduleRepository } from './schedule.repository'
