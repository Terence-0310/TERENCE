import { NextRequest } from 'next/server'
import { ok, serverError, notFound, badRequest } from '@/src/be/shared/api-handler'
import { 
  getMoviePlaybackData, 
  getMoviePlaybackByTmdbId, 
  getMoviePlaybackByTitle, 
  getMultiServerSources 
} from '@/src/be/modules/watch/playback.service'
import { getMovieDetail } from '@/src/be/services/tmdb/movie-service'
import { resolveMovieSource } from '@/src/be/services/video-source'
import { AuthService } from '@/src/be/modules/auth'
import { prisma } from '@/lib/db/prisma'
import type { EpisodePlaybackData, PlayableSubtitle } from '@/lib/player/types'

export class WatchController {
  static async getPlayback(
    req: NextRequest,
    context: { params: Promise<{ slug: string }> }
  ) {
    try {
      const { slug } = await context.params
      const searchParams = req.nextUrl.searchParams
      const episodeSlug = searchParams.get('ep') || undefined

      const session = await AuthService.getSession()
      const userId = session?.user?.id

      if (!slug || slug.trim() === '') {
        return badRequest('Missing slug parameter')
      }

      // ── Step 1: Try DB-backed playback ──
      let dbPlayback = await getMoviePlaybackData(slug, episodeSlug)

      // If not found by slug, try TMDB ID if it's a number
      const movieId = Number(slug)
      if (!dbPlayback && !isNaN(movieId) && movieId > 0) {
        dbPlayback = await getMoviePlaybackByTmdbId(movieId, episodeSlug)
      }

      // ── Step 2: Fetch TMDB metadata for rich UI/fallback ──
      let tmdbMovie = null
      if (!isNaN(movieId)) {
        try {
          tmdbMovie = await getMovieDetail(movieId)
        } catch {
          // Safe ignore
        }
      }

      // Bridge TMDB title to OPhim DB
      if (!dbPlayback && tmdbMovie) {
        dbPlayback = await getMoviePlaybackByTitle(tmdbMovie.title, episodeSlug)
        if (!dbPlayback && tmdbMovie.originalTitle && tmdbMovie.originalTitle !== tmdbMovie.title) {
          dbPlayback = await getMoviePlaybackByTitle(tmdbMovie.originalTitle, episodeSlug)
        }
      }

      let episodeData = dbPlayback?.currentEpisode || null
      let hasDbSource = !!episodeData?.primarySource

      // ── Step 3: Fallback providers (Ophim/Demo/Trailer) ──
      let legacySource = null
      if (!hasDbSource && tmdbMovie) {
        try {
          legacySource = await resolveMovieSource(tmdbMovie, episodeSlug)
        } catch {
          // Safe ignore 
        }
      }

      // Try mapping standard playable sources
      if (!episodeData && legacySource?.available && legacySource.playback) {
        const playbackType = legacySource.playback.type
        const isPlayableType = playbackType === 'hls' || playbackType === 'mp4'

        if (isPlayableType) {
          episodeData = {
            episode: {
              id: 'legacy-ep',
              episodeNumber: 1,
              episodeName: 'Tập Full',
              episodeSlug: null,
              title: null,
              description: null,
              thumbnailUrl: null,
              duration: null,
              isActive: true,
            },
            sources: [{
              id: 'legacy-src',
              sourceType: playbackType,
              url: legacySource.playback.url,
              label: legacySource.playback.label || 'Main',
              isPrimary: true,
              mimeType: null,
            }],
            primarySource: {
              id: 'legacy-src',
              sourceType: playbackType,
              url: legacySource.playback.url,
              label: legacySource.playback.label || 'Main',
              isPrimary: true,
              mimeType: null,
            },
            subtitles: legacySource.playback.subtitles?.map((s: { label: string; lang: string; url: string; default?: boolean }, i: number): PlayableSubtitle => ({
              id: `legacy-sub-${i}`,
              label: s.label,
              lang: s.lang,
              url: s.url,
              isDefault: s.default || false,
              kind: 'subtitles',
            })) || [],
            nextEpisode: null,
            prevEpisode: null,
          } satisfies EpisodePlaybackData
          hasDbSource = true
        }
      }

      // ── Step 4: Multi-server sources ──
      let multiServerSources: any[] = []
      if (dbPlayback?.movie?.id && episodeData?.episode) {
        try {
          multiServerSources = await getMultiServerSources(
            dbPlayback.movie.id,
            episodeData.episode.episodeNumber,
          )
        } catch {
          // non-critical
        }
      }

      const hasAnySource = !!episodeData?.primarySource || (legacySource?.available && legacySource.playback)
      const activeMovieId = dbPlayback?.movie?.id || tmdbMovie?.id || slug

      if (!dbPlayback && !tmdbMovie && !hasAnySource) {
        return notFound('No movie playback found')
      }

      // ── Step 5: Resume Progress ──
      let resume = null
      if (userId && activeMovieId) {
        const activeEpId = episodeData?.episode?.id
        // Do not fetch resume for mock legacy-ep
        if (activeEpId && !activeEpId.startsWith('legacy-')) {
          const history = await prisma.watchHistory.findFirst({
            where: { userId, movieId: activeMovieId.toString(), episodeId: activeEpId }
          })
          if (history) {
            resume = {
              currentTime: history.currentTime,
              duration: history.duration,
              progressPercent: history.progress,
              isCompleted: history.isCompleted
            }
          }
        } else {
          const history = await prisma.watchHistory.findFirst({
            where: { userId, movieId: activeMovieId.toString() },
            orderBy: { lastWatchedAt: 'desc' }
          })
          if (history) {
            resume = {
              currentTime: history.currentTime,
              duration: history.duration,
              progressPercent: history.progress,
              isCompleted: history.isCompleted
            }
          }
        }
      }

      // Determine fallback
      let fallback = null
      if (!episodeData?.primarySource && legacySource?.available && legacySource.playback) {
        if (legacySource.playback.type === 'iframe' || legacySource.playback.type === 'youtube') {
          fallback = {
            isFallback: true,
            type: legacySource.playback.type,
            url: legacySource.playback.url,
            provider: legacySource.providerName
          }
        }
      } else if (!hasAnySource && tmdbMovie?.trailer?.embedUrl) {
        fallback = {
          isFallback: true,
          type: 'iframe',
          url: tmdbMovie.trailer.embedUrl,
          provider: 'youtube-trailer'
        }
      }

      if (!episodeData?.sources?.length && !fallback) {
        return ok({
          errorCode: 1,
          movie: dbPlayback?.movie || tmdbMovie,
          fallback: null
        }, 'No stream available')
      }

      return ok({
        errorCode: 0,
        movie: dbPlayback?.movie || tmdbMovie,
        episode: episodeData?.episode || null,
        sources: episodeData?.sources || [],
        servers: multiServerSources || [],
        subtitles: episodeData?.subtitles || [],
        fallback,
        resume
      }, 'Success')
    } catch (error) {
      const { logger } = await import('@/src/be/shared/utils/logger')
      logger.error({ err: error }, '[API] WatchController.getPlayback error')
      return serverError()
    }
  }
}
