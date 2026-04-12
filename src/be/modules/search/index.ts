// ============================================
// Search Module — Barrel Export
// ============================================

export { getClient, getMoviesIndex, isAvailable, resetAvailability, closeClient, MOVIES_INDEX_MAPPING } from './elastic-client'
export { buildDocument, createIndex, indexMovie, deleteMovieFromIndex, reindexAll } from './movie-search-indexer'
export { searchMovies, suggestMovies } from './movie-search-service'
export type { SearchResult, SearchResultItem, SuggestItem } from './movie-search-service'
