// ============================================
// Shared OPhim Sync Helpers
// ============================================
// Sprint 3: Extracted from ophim-sync-service.ts and ophim18-sync-service.ts
// to eliminate ~150 lines of 100%-identical duplicated code.
//
// This module provides:
// - Shared PrismaClient instance for sync scripts
// - SyncJob lifecycle helpers (create, complete, fail)
// - SyncLog creation helper
// - Relation upsert helpers (categories, countries, episodes)
// - Prisma disconnect
//
// Source-specific behavior (fetch, map, movie source upsert) remains
// in the individual sync service files.

import { PrismaClient } from '@prisma/client'

// ─── Shared Prisma Instance ─────────────────────────────────────
// Use a dedicated Prisma instance for sync scripts (not the singleton from lib/db)

export const syncPrisma = new PrismaClient()

// ─── Types ──────────────────────────────────────────────────────

export interface SyncJobStats {
  total: number
  processed: number
  failed: number
  skipped: number
}

// ─── SyncJob Lifecycle ──────────────────────────────────────────

/**
 * Create a new SyncJob record.
 * @param source - 'ophim' or 'ophim18'
 */
export async function createSyncJob(
  source: string,
  jobType: string,
  metadata?: Record<string, unknown>,
) {
  return syncPrisma.syncJob.create({
    data: {
      source,
      jobType,
      status: 'running',
      startedAt: new Date(),
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })
}

/**
 * Mark a SyncJob as completed (or partial/failed based on stats).
 * Supports 'partial' status when some items failed but others succeeded.
 */
export async function completeSyncJob(jobId: string, stats: SyncJobStats) {
  const status =
    stats.failed > 0 && stats.processed === 0
      ? 'failed'
      : stats.failed > 0
        ? 'partial'
        : 'completed'

  await syncPrisma.syncJob.update({
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

/**
 * Mark a SyncJob as failed with an error message.
 */
export async function failSyncJob(jobId: string, error: string) {
  await syncPrisma.syncJob.update({
    where: { id: jobId },
    data: {
      status: 'failed',
      errorMessage: error,
      completedAt: new Date(),
    },
  })
}

/**
 * Create a SyncLog entry for audit trail.
 * @param source - 'ophim' or 'ophim18'
 */
export async function addSyncLog(
  source: string,
  syncJobId: string,
  movieId: string | null,
  action: string,
  status: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  await syncPrisma.syncLog.create({
    data: {
      syncJobId,
      movieId,
      source,
      action,
      status,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })
}

// ─── Relation Upsert Helpers ────────────────────────────────────

/**
 * Upsert genres for a movie (Genre + MovieGenre pivot).
 */
export async function upsertGenres(
  movieId: string,
  genres: Array<{ name: string; slug: string }>,
) {
  for (const item of genres) {
    const genre = await syncPrisma.genre.upsert({
      where: { slug: item.slug },
      create: { name: item.name, slug: item.slug, isActive: true },
      update: { name: item.name },
    })

    await syncPrisma.movieGenre.upsert({
      where: { movieId_genreId: { movieId, genreId: genre.id } },
      create: { movieId, genreId: genre.id },
      update: {},
    })
  }
}

/**
 * Upsert countries for a movie (Country + MovieCountry pivot).
 */
export async function upsertCountries(
  movieId: string,
  countries: Array<{ name: string; slug: string }>,
) {
  for (const ctr of countries) {
    const country = await syncPrisma.country.upsert({
      where: { slug: ctr.slug },
      create: { name: ctr.name, slug: ctr.slug, isActive: true },
      update: { name: ctr.name },
    })

    await syncPrisma.movieCountry.upsert({
      where: { movieId_countryId: { movieId, countryId: country.id } },
      create: { movieId, countryId: country.id },
      update: {},
    })
  }
}

/**
 * Upsert episodes for a movie.
 * Uses (movieId + episodeSlug + serverName) as natural dedup key.
 */
export async function upsertEpisodes(
  movieId: string,
  episodes: Array<{
    sourceName: string
    serverName: string
    episodeName: string
    episodeSlug: string
    episodeNumber: number
    episodeOrder: number
    streamType: string
    streamUrl: string | null
    sourceUrl: string | null
    status: string
    isActive: boolean
  }>,
): Promise<number> {
  let count = 0
  for (const ep of episodes) {
    const existing = await syncPrisma.episode.findFirst({
      where: {
        movieId,
        episodeSlug: ep.episodeSlug,
        serverName: ep.serverName,
      },
    })

    if (existing) {
      await syncPrisma.episode.update({
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
      await syncPrisma.episode.create({
        data: { movieId, ...ep },
      })
    }
    count++
  }
  return count
}

// ─── Disconnect ─────────────────────────────────────────────────

/**
 * Disconnect the sync Prisma client. Call when script is done.
 */
export async function disconnect() {
  await syncPrisma.$disconnect()
}
