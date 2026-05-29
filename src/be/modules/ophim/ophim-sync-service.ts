// ============================================
// OPhim Sync Service
// ============================================
// Orchestrates the full sync pipeline: fetch → map → upsert → log.
// All operations are wrapped in SyncJob/SyncLog for audit.
//
// Sprint 3: Common sync helpers extracted to sync-helpers.ts.
// This file retains source-specific logic: OPhim client/mapper,
// movie source upsert, and the sync orchestration flow.

import {
  syncPrisma as prisma,
  createSyncJob as _createSyncJob,
  completeSyncJob,
  failSyncJob,
  addSyncLog as _addSyncLog,
  upsertGenres,
  upsertCountries,
  upsertEpisodes,
  disconnect,
} from './sync-helpers'
import { fetchCatalogPage, fetchMovieDetail } from './ophim-client'
import { mapMovie, mapEpisodes, mapCategories, mapCountries } from './ophim-mapper'
import type { SyncResult } from './types'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'ophim-sync' })

// ─── Source Constants ───────────────────────────────────────────

const SOURCE = 'ophim'

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
    where: { movieId, sourceName: 'OPhim' },
  })

  if (existing) {
    await prisma.movieSource.update({
      where: { id: existing.id },
      data: {
        sourceId: ophimId,
        sourceUrl: `https://ophim1.com/phim/${slug}`,
        isActive: true,
        lastChecked: new Date(),
      },
    })
  } else {
    await prisma.movieSource.create({
      data: {
        movieId,
        sourceName: 'OPhim',
        sourceId: ophimId,
        sourceUrl: `https://ophim1.com/phim/${slug}`,
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
 * Sync a single movie by slug from OPhim.
 * Fetches detail, upserts Movie + Episodes + Categories + Countries + MovieSource.
 */
export async function syncMovieBySlug(slug: string, syncJobId?: string): Promise<SyncResult> {
  const jobId = syncJobId || (await createSyncJob('single', { slug })).id
  const isOwnJob = !syncJobId

  try {
    // 1. Fetch from OPhim
    const detail = await fetchMovieDetail(slug)
    const raw = detail.movie

    // 2. Map data
    const movieData = mapMovie(raw)
    const episodeData = mapEpisodes(detail.episodes)
    const categories = mapCategories(raw)
    const countries = mapCountries(raw)

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
          isPublished: movieData.status === 'published',
          lastSyncedAt: new Date(),
        },
      })
    } else {
      movie = await prisma.movie.update({
        where: { id: movie!.id },
        data: {
          // Only update fields from ophim, don't overwrite manual edits
          ophimId: movieData.ophimId,
          title: movieData.title,
          originalTitle: movieData.originalTitle,
          description: movie!.description || movieData.description, // keep existing if set
          contentType: movieData.contentType,
          quality: movieData.quality,
          language: movieData.language,
          year: movieData.year,
          episodeCurrent: movieData.episodeCurrent,
          episodeTotal: movieData.episodeTotal,
          thumbUrl: movieData.thumbUrl || movie!.thumbUrl,
          posterUrl: movieData.posterUrl || movie!.posterUrl,
          isCopyright: movieData.isCopyright,


          tmdbId: movieData.tmdbId || movie!.tmdbId,
          imdbId: movieData.imdbId || movie!.imdbId,
          metadataSource: 'ophim',
          sourceStatus: 'active',
          status: movie!.status === 'draft' ? movieData.status : movie!.status, // don't override published/hidden
          isPublished: movie!.isPublished || movieData.status === 'published',
          lastSyncedAt: new Date(),
        },
      })
    }

    // 4. Upsert related data
    await upsertGenres(movie.id, categories)
    await upsertCountries(movie.id, countries)
    const epCount = await upsertEpisodes(movie.id, episodeData)
    await upsertMovieSource(movie.id, movieData.ophimId, movieData.slug)

    // 5. Log
    await addSyncLog(jobId, movie.id, action, 'success',
      `${action === 'create' ? 'Created' : 'Updated'} "${movieData.title}" with ${epCount} episodes`,
      { slug, episodeCount: epCount, categories: categories.length, countries: countries.length }
    )

    if (isOwnJob) {
      await completeSyncJob(jobId, { total: 1, processed: 1, failed: 0, skipped: 0 })
    }

    return {
      action,
      movieSlug: movieData.slug,
      movieTitle: movieData.title,
      movieId: movie.id,
      episodeCount: epCount,
      message: `${action === 'create' ? 'Created' : 'Updated'} with ${epCount} episodes`,
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
 * Sync catalog pages from OPhim.
 * Fetches the catalog listing, then syncs each movie detail.
 *
 * @param startPage First page to sync (1-indexed)
 * @param endPage Last page to sync (inclusive). Defaults to startPage.
 * @param delayMs Delay between movie syncs to avoid rate limiting
 */
export async function syncCatalog(
  startPage: number = 1,
  endPage?: number,
  delayMs: number = 500
): Promise<{ jobId: string; results: SyncResult[] }> {
  const job = await createSyncJob('incremental', { startPage, endPage })
  const results: SyncResult[] = []
  const stats = { total: 0, processed: 0, failed: 0, skipped: 0 }

  try {
    // 1. Determine page range
    const firstPage = await fetchCatalogPage(startPage)
    const maxPage = endPage || startPage
    const actualEnd = Math.min(maxPage, firstPage.pagination.totalPages)

    log.info({ startPage, endPage: actualEnd, totalItems: firstPage.pagination.totalItems }, `Syncing pages ${startPage} to ${actualEnd}`)

    // 2. Process pages
    const chunkSize = 5 // Process 5 movies concurrently per chunk
    for (let page = startPage; page <= actualEnd; page++) {
      const catalog = page === startPage ? firstPage : await fetchCatalogPage(page)
      const items = catalog.items || []

      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize)
        
        // Add delay between chunks
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }

        const chunkPromises = chunk.map(async (item) => {
          try {
            const result = await syncMovieBySlug(item.slug, job.id)
            return { success: true, item, result }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            log.error({ slug: item.slug, err: errorMsg }, 'Error syncing movie')
            await addSyncLog(job.id, null, 'fail', 'error', `Failed: ${item.slug}: ${errorMsg}`, { slug: item.slug })
            return { 
              success: false, 
              item, 
              result: { action: 'fail', movieSlug: item.slug, movieTitle: item.name, error: errorMsg } 
            }
          }
        })

        const chunkResults = await Promise.all(chunkPromises)

        for (const res of chunkResults) {
          stats.total++
          results.push(res.result as SyncResult)
          if (res.result.action === 'fail') {
            stats.failed++
          } else {
            stats.processed++
          }
        }

        if (stats.total % 10 === 0 || stats.total === items.length) {
          log.info({ total: stats.total, processed: stats.processed, failed: stats.failed }, 'Progress')
        }
      }
    }

    await completeSyncJob(job.id, stats)

    log.info({ total: stats.total, synced: stats.processed, failed: stats.failed, skipped: stats.skipped }, 'Completed')

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await failSyncJob(job.id, errorMsg)
    log.error({ err: errorMsg }, 'Job failed')
  }

  return { jobId: job.id, results }
}

// Re-export disconnect from shared helpers
export { disconnect }
