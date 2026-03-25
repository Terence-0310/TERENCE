// ============================================
// OPhim Sync Service
// ============================================
// Orchestrates the full sync pipeline: fetch → map → upsert → log.
// All operations are wrapped in SyncJob/SyncLog for audit.

import { PrismaClient } from '@prisma/client'
import { fetchCatalogPage, fetchMovieDetail } from './ophim-client'
import { mapMovie, mapEpisodes, mapCategories, mapCountries } from './ophim-mapper'
import type { SyncResult } from './types'

// Use a dedicated Prisma instance for sync scripts (not the singleton from lib/db)
const prisma = new PrismaClient()

// ─── SyncJob Helpers ────────────────────────────────────────────

async function createSyncJob(jobType: string, metadata?: Record<string, unknown>) {
  return prisma.syncJob.create({
    data: {
      source: 'ophim',
      jobType,
      status: 'running',
      startedAt: new Date(),
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })
}

async function completeSyncJob(jobId: string, stats: { total: number; processed: number; failed: number; skipped: number }) {
  await prisma.syncJob.update({
    where: { id: jobId },
    data: {
      status: stats.failed > 0 && stats.processed === 0 ? 'failed' : 'completed',
      totalItems: stats.total,
      processedItems: stats.processed,
      failedItems: stats.failed,
      skippedItems: stats.skipped,
      completedAt: new Date(),
    },
  })
}

async function failSyncJob(jobId: string, error: string) {
  await prisma.syncJob.update({
    where: { id: jobId },
    data: {
      status: 'failed',
      errorMessage: error,
      completedAt: new Date(),
    },
  })
}

async function addSyncLog(
  syncJobId: string,
  movieId: string | null,
  action: string,
  status: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  await prisma.syncLog.create({
    data: {
      syncJobId,
      movieId,
      source: 'ophim',
      action,
      status,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })
}

// ─── Category & Country Upsert ──────────────────────────────────

async function upsertCategories(movieId: string, categories: Array<{ name: string; slug: string }>) {
  for (const cat of categories) {
    // Upsert category
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: { name: cat.name, slug: cat.slug, isActive: true },
      update: { name: cat.name },
    })

    // Upsert pivot
    await prisma.movieCategory.upsert({
      where: { movieId_categoryId: { movieId, categoryId: category.id } },
      create: { movieId, categoryId: category.id },
      update: {},
    })
  }
}

async function upsertCountries(movieId: string, countries: Array<{ name: string; slug: string }>) {
  for (const ctr of countries) {
    const country = await prisma.country.upsert({
      where: { slug: ctr.slug },
      create: { name: ctr.name, slug: ctr.slug, isActive: true },
      update: { name: ctr.name },
    })

    await prisma.movieCountry.upsert({
      where: { movieId_countryId: { movieId, countryId: country.id } },
      create: { movieId, countryId: country.id },
      update: {},
    })
  }
}

// ─── Episode Upsert ─────────────────────────────────────────────

async function upsertEpisodes(movieId: string, episodes: ReturnType<typeof mapEpisodes>) {
  let count = 0
  for (const ep of episodes) {
    // Use movieId + episodeSlug + serverName as a natural dedup key
    const existing = await prisma.episode.findFirst({
      where: {
        movieId,
        episodeSlug: ep.episodeSlug,
        serverName: ep.serverName,
      },
    })

    if (existing) {
      await prisma.episode.update({
        where: { id: existing.id },
        data: {
          sourceName: ep.sourceName,
          episodeName: ep.episodeName,
          episodeNumber: ep.episodeNumber,
          episodeOrder: ep.episodeOrder,
          streamType: ep.streamType,
          streamUrl: ep.streamUrl,
          sourceUrl: ep.sourceUrl,
          status: ep.status,
          isActive: ep.isActive,
        },
      })
    } else {
      await prisma.episode.create({
        data: {
          movieId,
          ...ep,
        },
      })
    }
    count++
  }
  return count
}

// ─── MovieSource Upsert ─────────────────────────────────────────

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
          actorText: movieData.actorText,
          directorText: movieData.directorText,
          categoryText: movieData.categoryText,
          countryText: movieData.countryText,
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
    await upsertCategories(movie.id, categories)
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

    console.log(`[OPhim Sync] Syncing pages ${startPage} to ${actualEnd} (total: ${firstPage.pagination.totalItems} movies in catalog)`)

    // 2. Process pages
    for (let page = startPage; page <= actualEnd; page++) {
      const catalog = page === startPage ? firstPage : await fetchCatalogPage(page)

      for (const item of catalog.items) {
        stats.total++

        try {
          // Add delay between requests
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

          // Progress log every 10 movies
          if (stats.total % 10 === 0) {
            console.log(`[OPhim Sync] Progress: ${stats.total} total, ${stats.processed} synced, ${stats.failed} failed`)
          }

        } catch (error) {
          stats.failed++
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.error(`[OPhim Sync] Error syncing ${item.slug}: ${errorMsg}`)

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

    console.log(`\n[OPhim Sync] ✅ Completed!`)
    console.log(`  Total: ${stats.total}`)
    console.log(`  Synced: ${stats.processed}`)
    console.log(`  Failed: ${stats.failed}`)
    console.log(`  Skipped: ${stats.skipped}`)

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await failSyncJob(job.id, errorMsg)
    console.error(`[OPhim Sync] ❌ Job failed: ${errorMsg}`)
  }

  return { jobId: job.id, results }
}

/**
 * Disconnect Prisma when script is done.
 */
export async function disconnect() {
  await prisma.$disconnect()
}
