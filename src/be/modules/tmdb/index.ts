// ============================================
// TMDB Module — Barrel Export
// ============================================

export { searchMovies, searchTv, getMovieDetail, getTvDetail, getExternalIds, getVideos, getCredits, buildImageUrl, testConnection } from './tmdb-client'
export { matchMovie, MIN_AUTO_BIND_CONFIDENCE } from './tmdb-matcher'
export { enrichMovie, enrichBatch, disconnect } from './tmdb-enrichment-service'
export type * from './types'
