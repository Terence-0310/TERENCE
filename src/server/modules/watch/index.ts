// ============================================
// Watch Module — Barrel Export
// ============================================

export * from './watch.types'
export {
  bootstrap,
  saveProgress,
  markComplete,
  getContinueWatching,
  // Legacy re-exports
  getMoviePlaybackData,
  getMoviePlaybackByTmdbId,
  getMoviePlaybackByTitle,
  getEpisodePlaybackData,
  getMultiServerSources,
  getAllMovieServers,
} from './watch.service'
