// ============================================
// KKPhim Module — Barrel Export
// ============================================

export { fetchCatalogPage, fetchMovieDetail, fetchTotalPages, testConnection } from './kkphim-client'
export { mapMovie, mapEpisodes, mapCategories, mapCountries } from './kkphim-mapper'
export { syncMovieBySlug, syncCatalog, disconnect } from './kkphim-sync-service'
export type * from './types'
