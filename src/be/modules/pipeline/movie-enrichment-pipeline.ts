// ============================================
// Movie Enrichment Pipeline
// ============================================
// Orchestration layer that combines:
//   1. OPhim18 sync (metadata + episodes/source)
//   2. TMDB enrichment (tmdbId, imdbId, trailer, backdrop, cast/director)
//
// Pipeline is resilient: TMDB failure does NOT rollback OPhim18 sync.

import { PrismaClient } from '@prisma/client'
import { syncMovieBySlug as ophim18Sync } from '../ophim/ophim18-sync-service'
import { enrichMovie as tmdbEnrich } from '../tmdb/tmdb-enrichment-service'
import { logger } from '@/src/be/shared/utils/logger'

const prisma = new PrismaClient()
const log = logger.child({ module: 'movie-enrichment-pipeline' })

// ─── Types ──────────────────────────────────────────────────────

export interface PipelineResult {
  slug: string
  movieId?: string
  movieTitle?: string
  ophim18: {
    status: 'success' | 'partial' | 'failed' | 'skipped'
    action?: string
    episodeCount?: number
    message?: string
    error?: string
  }
  tmdb: {
    status: 'success' | 'partial' | 'failed' | 'skipped'
    tmdbId?: number
    imdbId?: string
    confidence?: number
    fieldsUpdated?: string[]
    message?: string
    error?: string
  }
  overall: 'success' | 'partial' | 'failed'
}

// ─── SyncJob Helpers ────────────────────────────────────────────

async function createPipelineJob(jobType: string, metadata?: Record<string, unknown>) {
  return prisma.syncJob.create({
    data: {
      source: 'pipeline',
      jobType,
      status: 'running',
      startedAt: new Date(),
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })
}

async function completePipelineJob(
  jobId: string,
  stats: { total: number; processed: number; failed: number; skipped: number }
) {
  const status = stats.failed > 0 && stats.processed === 0
    ? 'failed'
    : stats.failed > 0 || stats.skipped > 0
      ? 'partial'
      : 'completed'

  await prisma.syncJob.update({
    where: { id: jobId },
    data: {
      status,
      totalItems: stats.total,
      processedItems: stats.processed,
      failedItems: stats.failed,
      skippedItems: stats.skipped,
      completedAt: new Date(),
    },
  })
}

async function failPipelineJob(jobId: string, error: string) {
  await prisma.syncJob.update({
    where: { id: jobId },
    data: { status: 'failed', errorMessage: error, completedAt: new Date() },
  })
}

async function addPipelineLog(
  syncJobId: string, movieId: string | null, action: string,
  status: string, message: string, metadata?: Record<string, unknown>
) {
  await prisma.syncLog.create({
    data: {
      syncJobId, movieId, source: 'pipeline', action, status, message,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC PIPELINE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Full pipeline for a single movie:
 *   1. Sync from OPhim18 (metadata + episodes)
 *   2. Enrich from TMDB (trailer, backdrop, cast, IDs)
 *   3. Log everything
 *
 * IMPORTANT: TMDB failure does NOT rollback OPhim18 data.
 */
export async function runMoviePipeline(
  slug: string,
  syncJobId?: string
): Promise<PipelineResult> {
  const jobId = syncJobId || (await createPipelineJob('single', { slug })).id
  const isOwnJob = !syncJobId

  const result: PipelineResult = {
    slug,
    ophim18: { status: 'skipped' },
    tmdb: { status: 'skipped' },
    overall: 'failed',
  }

  try {
    // ─── Step 1: OPhim18 Sync ─────────────────────────────────
    log.info({ slug }, 'Step 1/2: Syncing from OPhim18')

    try {
      const ophimResult = await ophim18Sync(slug)

      if (ophimResult.action === 'fail') {
        result.ophim18 = {
          status: 'failed',
          action: 'fail',
          message: ophimResult.message,
          error: ophimResult.error,
        }

        await addPipelineLog(jobId, null, 'sync', 'error',
          `OPhim18 sync failed for "${slug}": ${ophimResult.error}`,
          { slug, error: ophimResult.error }
        )

        // Even if OPhim18 fails, try TMDB enrichment if movie already exists
        const existingMovie = await prisma.movie.findFirst({
          where: { slug },
          select: { id: true, title: true },
        })

        if (!existingMovie) {
          result.overall = 'failed'
          if (isOwnJob) await failPipelineJob(jobId, `OPhim18 sync failed: ${ophimResult.error}`)
          return result
        }

        result.movieId = existingMovie.id
        result.movieTitle = existingMovie.title
      } else {
        result.ophim18 = {
          status: 'success',
          action: ophimResult.action,
          episodeCount: ophimResult.episodeCount,
          message: ophimResult.message,
        }
        result.movieId = ophimResult.movieId
        result.movieTitle = ophimResult.movieTitle

        await addPipelineLog(jobId, ophimResult.movieId || null, 'sync', 'success',
          `OPhim18: ${ophimResult.message}`,
          { action: ophimResult.action, episodeCount: ophimResult.episodeCount }
        )
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      result.ophim18 = { status: 'failed', error: errorMsg }
      log.error({ err: errorMsg }, 'OPhim18 sync error')

      await addPipelineLog(jobId, null, 'sync', 'error',
        `OPhim18 sync crashed for "${slug}": ${errorMsg}`, { slug, error: errorMsg }
      )

      // Try to find existing movie for TMDB enrichment
      const existingMovie = await prisma.movie.findFirst({
        where: { slug },
        select: { id: true, title: true },
      })

      if (!existingMovie) {
        result.overall = 'failed'
        if (isOwnJob) await failPipelineJob(jobId, errorMsg)
        return result
      }
      result.movieId = existingMovie.id
      result.movieTitle = existingMovie.title
    }

    // ─── Step 2: TMDB Enrichment ──────────────────────────────
    if (result.movieId) {
      log.info({ movieTitle: result.movieTitle }, 'Step 2/2: Enriching from TMDB')

      try {
        const tmdbResult = await tmdbEnrich(result.movieId)

        if (tmdbResult.action === 'fail') {
          result.tmdb = {
            status: 'failed',
            message: tmdbResult.message,
            error: tmdbResult.error,
          }
          log.warn({ err: tmdbResult.error }, 'TMDB enrichment failed')

          await addPipelineLog(jobId, result.movieId, 'enrich', 'warning',
            `TMDB enrichment failed (non-blocking): ${tmdbResult.error}`,
            { movieId: result.movieId, error: tmdbResult.error }
          )
        } else if (tmdbResult.action === 'skip') {
          result.tmdb = {
            status: 'skipped',
            tmdbId: tmdbResult.tmdbId,
            confidence: tmdbResult.confidence,
            message: tmdbResult.message,
          }

          await addPipelineLog(jobId, result.movieId, 'enrich', 'warning',
            `TMDB enrichment skipped: ${tmdbResult.message}`,
            { tmdbId: tmdbResult.tmdbId, confidence: tmdbResult.confidence }
          )
        } else {
          // Fetch the updated movie data for imdbId
          const updatedMovie = await prisma.movie.findUnique({
            where: { id: result.movieId },
            select: { imdbId: true },
          })

          result.tmdb = {
            status: 'success',
            tmdbId: tmdbResult.tmdbId,
            imdbId: updatedMovie?.imdbId || undefined,
            confidence: tmdbResult.confidence,
            fieldsUpdated: tmdbResult.fieldsUpdated,
            message: tmdbResult.message,
          }

          await addPipelineLog(jobId, result.movieId, 'enrich', 'success',
            `TMDB: ${tmdbResult.message}`,
            {
              tmdbId: tmdbResult.tmdbId,
              imdbId: updatedMovie?.imdbId,
              confidence: tmdbResult.confidence,
              fields: tmdbResult.fieldsUpdated,
            }
          )
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        result.tmdb = { status: 'failed', error: errorMsg }
        log.error({ err: errorMsg }, 'TMDB enrichment error (non-blocking)')

        await addPipelineLog(jobId, result.movieId, 'enrich', 'warning',
          `TMDB enrichment crashed (non-blocking): ${errorMsg}`,
          { movieId: result.movieId, error: errorMsg }
        )
      }
    }

    // ─── Determine overall status ─────────────────────────────
    const ophimOk = result.ophim18.status === 'success'
    const tmdbOk = result.tmdb.status === 'success'

    if (ophimOk && tmdbOk) {
      result.overall = 'success'
    } else if (ophimOk || tmdbOk) {
      result.overall = 'partial'
    } else {
      result.overall = 'failed'
    }

    if (isOwnJob) {
      await completePipelineJob(jobId, {
        total: 1,
        processed: result.overall !== 'failed' ? 1 : 0,
        failed: result.overall === 'failed' ? 1 : 0,
        skipped: 0,
      })
    }

    log.info({ movieTitle: result.movieTitle, overall: result.overall, ophim18: result.ophim18.status, tmdb: result.tmdb.status }, 'Pipeline complete')

    return result

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    result.overall = 'failed'
    if (isOwnJob) await failPipelineJob(jobId, errorMsg)
    log.error({ err: errorMsg }, 'Fatal error')
    return result
  }
}

/**
 * Run pipeline for a batch of movies by slugs.
 */
export async function runBatchPipeline(
  slugs: string[],
  delayMs: number = 1000
): Promise<{ jobId: string; results: PipelineResult[] }> {
  const job = await createPipelineJob('batch', { count: slugs.length })
  const results: PipelineResult[] = []
  const stats = { total: slugs.length, processed: 0, failed: 0, skipped: 0 }

  try {
    for (let i = 0; i < slugs.length; i++) {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }

      log.info({ index: i + 1, total: slugs.length, slug: slugs[i] }, 'Processing movie')

      try {
        const result = await runMoviePipeline(slugs[i], job.id)
        results.push(result)

        switch (result.overall) {
          case 'success':
          case 'partial':
            stats.processed++
            break
          case 'failed':
            stats.failed++
            break
        }
      } catch (error) {
        stats.failed++
        const errorMsg = error instanceof Error ? error.message : String(error)
        log.error({ slug: slugs[i], err: errorMsg }, 'Error processing movie')

        results.push({
          slug: slugs[i],
          ophim18: { status: 'failed', error: errorMsg },
          tmdb: { status: 'skipped' },
          overall: 'failed',
        })
      }
    }

    await completePipelineJob(job.id, stats)

    log.info({ total: stats.total, processed: stats.processed, failed: stats.failed }, 'Batch complete')

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await failPipelineJob(job.id, errorMsg)
    log.error({ err: errorMsg }, 'Batch job failed')
  }

  return { jobId: job.id, results }
}

export async function disconnect() {
  await prisma.$disconnect()
}
