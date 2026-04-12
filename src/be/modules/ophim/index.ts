// ============================================
// OPhim Module — Barrel Export
// ============================================

export { fetchCatalogPage, fetchMovieDetail, fetchTotalPages, testConnection } from './ophim-client'
export { mapMovie, mapEpisodes, mapCategories, mapCountries } from './ophim-mapper'
export { syncMovieBySlug, syncCatalog, disconnect } from './ophim-sync-service'
export type * from './types'
