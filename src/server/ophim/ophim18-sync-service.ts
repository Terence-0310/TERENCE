// ============================================
// OPhim18 Sync Service
// ============================================
// Orchestrates: fetch from OPhim18 v1/api → map → upsert → log.
// All operations are wrapped in SyncJob/SyncLog for audit.
//
// Sprint 3: Common sync helpers extracted to sync-helpers.ts.
// This file retains source-specific logic: OPhim18 client/mapper,
// movie source upsert, playable source detection, and sync orchestration.

import {
  syncPrisma as prisma,
  createSyncJob as _createSyncJob,
  completeSyncJob,
  failSyncJob,
  addSyncLog as _addSyncLog,
  upsertCategories,
  upsertCountries,
  upsertEpisodes,
  disconnect,
} from './sync-helpers'
import { fetchCatalogPage, fetchMovieDetail } from './ophim18-client'
import { mapMovie, mapEpisodes, mapCategories, mapCountries } from './ophim18-mapper'
import type { SyncResult } from './ophim18-types'

// ─── Source Constants ───────────────────────────────────────────

const SOURCE = 'ophim18'
const LOG_PREFIX = '[OPhim18 Sync]'

// ─── Source-bound helpers ───────────────────────────────────────

function createSyncJob(jobType: string, metadata?: Record<string, unknown>) {
  return _createSyncJob(SOURCE, jobType, metadata)
}

function addSyncLog(
  syncJobId: string,
  movieId: string | null,
  action: string,
  status: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  return _addSyncLog(SOURCE, syncJobId, movieId, action, status, message, metadata)
}

// ─── MovieSource Upsert (source-specific) ───────────────────────

async function upsertMovieSource(movieId: string, ophimId: string, slug: string) {
  const existing = await prisma.movieSource.findFirst({
    where: { movieId, sourceName: 'OPhim18' },
  })

  const baseUrl = (process.env.OPHIM18_BASE_URL || 'https://ophim1.com').replace(/\/$/, '')

  if (existing) {
    await prisma.movieSource.update({
      where: { id: existing.id },
      data: {
        sourceId: ophimId,
        sourceUrl: `${baseUrl}/v1/api/phim/${slug}`,
        isActive: true,
        lastChecked: new Date(),
      },
    })
  } else {
    await prisma.movieSource.create({
      data: {
        movieId,
        sourceName: 'OPhim18',
        sourceId: ophimId,
        sourceUrl: `${baseUrl}/v1/api/phim/${slug}`,
        quality: 'HD',
        language: 'vietsub',
        priority: 10,
        isActive: true,
        lastChecked: new Date(),
      },
    })
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC SYNC FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Sync a single movie by slug from OPhim18.
 */
export async function syncMovieBySlug(slug: string, syncJobId?: string): Promise<SyncResult> {
  const jobId = syncJobId || (await createSyncJob('single', { slug })).id
  const isOwnJob = !syncJobId

  try {
    // 1. Fetch from OPhim18 v1/api
    const detail = await fetchMovieDetail(slug)
    const raw = detail.data.item
    const cdnBase = detail.data.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live'

    // 2. Map data
    const movieData = mapMovie(raw, cdnBase)
    const episodeData = mapEpisodes(raw.episodes || [])
    const categories = mapCategories(raw)
    const countries = mapCountries(raw)

    // Check if we have usable sources
    const usableEpisodes = episodeData.filter(ep => ep.streamUrl !== null)
    const hasPlayableSource = usableEpisodes.length > 0

    // 3. Upsert movie (by ophimId first, then slug)
    let movie = await prisma.movie.findFirst({
      where: {
        OR: [
          { ophimId: movieData.ophimId },
          { slug: movieData.slug },
        ],
      },
    })

    const isNew = !movie
    const action = isNew ? 'create' : 'update'

    if (isNew) {
      movie = await prisma.movie.create({
        data: {
          ...movieData,
          sourceStatus: hasPlayableSource ? 'active' : 'pending',
          isPublished: movieData.status === 'published',
          lastSyncedAt: new Date(),
        },
      })
    } else {
      movie = await prisma.movie.update({
        where: { id: movie!.id },
        data: {
          ophimId: movieData.ophimId,
          title: movieData.title,
          originalTitle: movieData.originalTitle,
          description: movie!.description || movieData.description,
          contentType: movieData.contentType,
          quality: movieData.quality,
          language: movieData.language,
          year: movieData.year,
          episodeCurrent: movieData.episodeCurrent,
          episodeTotal: movieData.episodeTotal,
          thumbUrl: movieData.thumbUrl || movie!.thumbUrl,
          posterUrl: movieData.posterUrl || movie!.posterUrl,
          isCopyright: movieData.isCopyright,
          actorText: movieData.actorText || movie!.actorText,
          directorText: movieData.directorText || movie!.directorText,
          categoryText: movieData.categoryText,
          countryText: movieData.countryText,
          tmdbId: movieData.tmdbId || movie!.tmdbId,
          imdbId: movieData.imdbId || movie!.imdbId,
          metadataSource: 'ophim18',
          sourceStatus: hasPlayableSource ? 'active' : (movie!.sourceStatus || 'pending'),
          status: movie!.status === 'draft' ? movieData.status : movie!.status,
          isPublished: movie!.isPublished || movieData.status === 'published',
          lastSyncedAt: new Date(),
        },
      })
    }

    // 4. Upsert related data
    await upsertCategories(movie.id, categories)
    await upsertCountries(movie.id, countries)
    const epCount = await upsertEpisodes(movie.id, episodeData)
    await upsertMovieSource(movie.id, movieData.ophimId, movieData.slug)

    // 5. Log
    const logStatus = hasPlayableSource ? 'success' : 'warning'
    const logMessage = hasPlayableSource
      ? `${action === 'create' ? 'Created' : 'Updated'} "${movieData.title}" with ${epCount} episodes (${usableEpisodes.length} playable)`
      : `${action === 'create' ? 'Created' : 'Updated'} "${movieData.title}" with ${epCount} episodes but NO playable source`

    await addSyncLog(jobId, movie.id, action, logStatus, logMessage, {
      slug,
      episodeCount: epCount,
      usableEpisodes: usableEpisodes.length,
      categories: categories.length,
      countries: countries.length,
      hasPlayableSource,
    })

    if (!hasPlayableSource) {
      await addSyncLog(jobId, movie.id, 'skip', 'warning',
        `Movie "${movieData.title}" synced but has no playable stream source`,
        { slug, sourceStatus: 'pending' }
      )
    }

    if (isOwnJob) {
      await completeSyncJob(jobId, { total: 1, processed: 1, failed: 0, skipped: 0 })
    }

    return {
      action,
      movieSlug: movieData.slug,
      movieTitle: movieData.title,
      movieId: movie.id,
      episodeCount: epCount,
      message: logMessage,
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)

    await addSyncLog(jobId, null, 'fail', 'error', `Failed to sync "${slug}": ${errorMsg}`, { slug, error: errorMsg })

    if (isOwnJob) {
      await failSyncJob(jobId, errorMsg)
    }

    return {
      action: 'fail',
      movieSlug: slug,
      movieTitle: slug,
      error: errorMsg,
    }
  }
}

/**
 * Sync catalog pages from OPhim18.
 */
export async function syncCatalog(
  startPage: number = 1,
  endPage?: number,
  delayMs: number = 500,
  catalogType: string = 'phim-moi-cap-nhat'
): Promise<{ jobId: string; results: SyncResult[] }> {
  const job = await createSyncJob('incremental', { startPage, endPage, catalogType })
  const results: SyncResult[] = []
  const stats = { total: 0, processed: 0, failed: 0, skipped: 0 }

  try {
    // 1. Determine page range
    const firstPage = await fetchCatalogPage(catalogType, startPage)
    const pagination = firstPage.data?.params?.pagination
    const maxPage = endPage || startPage
    const actualEnd = Math.min(maxPage, pagination?.totalPages || 1)

    console.log(`${LOG_PREFIX} Syncing pages ${startPage} to ${actualEnd} (total: ${pagination?.totalItems || 0} movies in catalog)`)

    // 2. Process pages
    for (let page = startPage; page <= actualEnd; page++) {
      const catalog = page === startPage ? firstPage : await fetchCatalogPage(catalogType, page)
      const items = catalog.data?.items || []

      for (const item of items) {
        stats.total++

        try {
          if (results.length > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
          }

          const result = await syncMovieBySlug(item.slug, job.id)
          results.push(result)

          if (result.action === 'fail') {
            stats.failed++
          } else {
            stats.processed++
          }

          if (stats.total % 10 === 0) {
            console.log(`${LOG_PREFIX} Progress: ${stats.total} total, ${stats.processed} synced, ${stats.failed} failed`)
          }

        } catch (error) {
          stats.failed++
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.error(`${LOG_PREFIX} Error syncing ${item.slug}: ${errorMsg}`)

          results.push({
            action: 'fail',
            movieSlug: item.slug,
            movieTitle: item.name,
            error: errorMsg,
          })

          await addSyncLog(job.id, null, 'fail', 'error', `Failed: ${item.slug}: ${errorMsg}`, { slug: item.slug })
        }
      }
    }

    await completeSyncJob(job.id, stats)

    console.log(`\n${LOG_PREFIX} ✅ Completed!`)
    console.log(`  Total: ${stats.total}`)
    console.log(`  Synced: ${stats.processed}`)
    console.log(`  Failed: ${stats.failed}`)
    console.log(`  Skipped: ${stats.skipped}`)

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await failSyncJob(job.id, errorMsg)
    console.error(`${LOG_PREFIX} ❌ Job failed: ${errorMsg}`)
  }

  return { jobId: job.id, results }
}

// Re-export disconnect from shared helpers
export { disconnect }
