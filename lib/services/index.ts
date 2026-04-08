// ============================================
// Services — Barrel Export
// ============================================
// All business logic goes through services.
// Services compose repositories + cache + external APIs.
//
// Usage:
//   import { movieService, taxonomyService } from '@/lib/services'

export { movieService } from './movie.service'
export { taxonomyService } from './taxonomy.service'
export { reviewService } from './review.service'
export { scheduleService } from './schedule.service'
export { personService } from './person.service'
