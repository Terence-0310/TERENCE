// ============================================
// Reviews Module — Barrel Export
// ============================================

export * from './reviews.types'
export {
  getReviewsByMovie,
  createReview,
  getAverageRating,
  // Legacy
  getReviews,
  getReviewById,
} from './reviews.service'
