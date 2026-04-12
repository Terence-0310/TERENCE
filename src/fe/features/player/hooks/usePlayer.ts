'use client'

// ============================================
// usePlayer — Player state management hook
// ============================================
// Refactored to act as an adapter that delegates to
// useSourceResolver and useResumeManager for a cleaner architecture.

import { useSourceResolver, type UseSourceResolverProps } from '../core/managers/useSourceResolver'
import { useResumeManager } from '../core/managers/useResumeManager'
import type { PlayerServer, PlayerMovieMeta } from '../core/player.types'

export type { PlayerServer, PlayerMovieMeta, PlayerServerEpisode as PlayerEpisode } from '../core/player.types'

export interface UsePlayerOptions extends UseSourceResolverProps {
  movieId: string
  movieMeta?: PlayerMovieMeta
}

export function usePlayer(options: UsePlayerOptions) {
  const {
    servers,
    movieId,
    episodeSlug,
    movieMeta,
    maxRetries = 3,
    onAllServersFailed,
  } = options

  // Delegate source logic to SourceResolver
  const resolver = useSourceResolver({
    servers,
    episodeSlug,
    maxRetries,
    onAllServersFailed,
  })

  // Delegate history and resume logic to ResumeManager
  const resume = useResumeManager({
    movieId,
    movieMeta,
    currentEpisode: resolver.currentEpisode,
    currentEpisodeIndex: resolver.currentEpisodeIndex,
    currentServerName: resolver.currentServerName,
    currentServerIndex: resolver.currentServerIndex,
  })

  // The returned structure matches the original `usePlayer` 
  // exactly to maintain backward compatibility.
  return {
    ...resolver,
    servers, // ensure compatibility
    saveProgress: resume.saveProgress,
    getSavedProgress: resume.getSavedProgress,
  }
}
