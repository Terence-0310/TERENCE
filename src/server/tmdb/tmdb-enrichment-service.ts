// ============================================
// TMDB Enrichment Service
// ============================================
// Enriches movie metadata from TMDB: trailer, backdrop, cast, directors, IDs.
// Does NOT change: slug, episodes, OPhim source, stream URLs.

import { PrismaClient } from '@prisma/client'
import { getExternalIds, getVideos, getCredits, buildImageUrl, buildProfileUrl } from './tmdb-client'
import { matchMovie, MIN_AUTO_BIND_CONFIDENCE } from './tmdb-matcher'
import type { EnrichResult, TmdbVideo } from './types'

const prisma = new PrismaClient()

// ─── Helpers ────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/** Pick best trailer from TMDB videos list */
function pickBestTrailer(videos: TmdbVideo[]): TmdbVideo | null {
  // Priority: Official Trailer > Trailer > Teaser, prefer YouTube
  const ranked = videos
    .filter(v => v.site === 'YouTube' && ['Trailer', 'Teaser'].includes(v.type))
    .sort((a, b) => {
      // Official first
      if (a.official !== b.official) return a.official ? -1 : 1
      // Trailer > Teaser
      if (a.type !== b.type) return a.type === 'Trailer' ? -1 : 1
      // Newer first
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    })
  return ranked[0] || null
}

// ─── SyncJob/Log ────────────────────────────────────────────────

async function createSyncJob(jobType: string, metadata?: Record<string, unknown>) {
  return prisma.syncJob.create({
    data: {
      source: 'tmdb',
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
    data: { status: 'failed', errorMessage: error, completedAt: new Date() },
  })
}

async function addSyncLog(
  syncJobId: string, movieId: string | null, action: string,
  status: string, message: string, metadata?: Record<string, unknown>
) {
  await prisma.syncLog.create({
    data: {
      syncJobId, movieId, source: 'tmdb', action, status, message,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })
}

// ─── Person Upsert ──────────────────────────────────────────────

async function upsertPerson(
  tmdbId: number, name: string, profilePath: string | null,
  gender: number, knownFor: string, popularity: number
): Promise<string> {
  const slug = slugify(name) || `person-${tmdbId}`
  const profileUrl = buildProfileUrl(profilePath)

  // Try find by tmdbId first
  let person = await prisma.person.findUnique({ where: { tmdbId } })

  if (person) {
    await prisma.person.update({
      where: { id: person.id },
      data: { name, profileUrl, gender, knownFor, popularity },
    })
    return person.id
  }

  // Try by slug
  person = await prisma.person.findUnique({ where: { slug } })
  if (person) {
    await prisma.person.update({
      where: { id: person.id },
      data: { tmdbId, name, profileUrl, gender, knownFor, popularity },
    })
    return person.id
  }

  // Create new
  // Handle slug collision
  let finalSlug = slug
  let counter = 1
  while (true) {
    const exists = await prisma.person.findUnique({ where: { slug: finalSlug } })
    if (!exists) break
    finalSlug = `${slug}-${counter++}`
  }

  const newPerson = await prisma.person.create({
    data: { tmdbId, name, slug: finalSlug, profileUrl, gender, knownFor, popularity, isActive: true },
  })
  return newPerson.id
}

async function upsertMoviePerson(movieId: string, personId: string, role: string, character: string | null, sortOrder: number) {
  await prisma.moviePerson.upsert({
    where: { movieId_personId_role: { movieId, personId, role } },
    create: { movieId, personId, role, character, sortOrder },
    update: { character, sortOrder },
  })
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC ENRICHMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Enrich a single movie with TMDB metadata.
 */
export async function enrichMovie(movieId: string, syncJobId?: string): Promise<EnrichResult> {
  const jobId = syncJobId || (await createSyncJob('single', { movieId })).id
  const isOwnJob = !syncJobId

  try {
    const movie = await prisma.movie.findUnique({ where: { id: movieId } })
    if (!movie) {
      await addSyncLog(jobId, movieId, 'fail', 'error', `Movie not found: ${movieId}`)
      if (isOwnJob) await failSyncJob(jobId, 'Movie not found')
      return { movieId, movieTitle: 'unknown', action: 'fail', message: 'Movie not found', error: 'Not found' }
    }

    console.log(`[TMDB Enrich] Processing: "${movie.title}" (${movie.originalTitle || 'no original title'})`)

    // 1. Match to TMDB
    const match = await matchMovie({
      title: movie.title,
      originalTitle: movie.originalTitle,
      year: movie.year,
      contentType: movie.contentType,
      ophimTmdbId: movie.tmdbId,
    })

    if (!match) {
      await addSyncLog(jobId, movieId, 'skip', 'warning', `No TMDB match found for "${movie.title}"`)
      if (isOwnJob) await completeSyncJob(jobId, { total: 1, processed: 0, failed: 0, skipped: 1 })
      return { movieId, movieTitle: movie.title, action: 'skip', message: 'No TMDB match found' }
    }

    if (match.confidence < MIN_AUTO_BIND_CONFIDENCE) {
      await addSyncLog(jobId, movieId, 'skip', 'warning',
        `Low confidence match (${match.confidence}) for "${movie.title}" → TMDB: ${match.title}`,
        { tmdbId: match.tmdbId, confidence: match.confidence, method: match.matchMethod }
      )
      if (isOwnJob) await completeSyncJob(jobId, { total: 1, processed: 0, failed: 0, skipped: 1 })
      return {
        movieId, movieTitle: movie.title, action: 'skip',
        tmdbId: match.tmdbId, confidence: match.confidence, matchMethod: match.matchMethod,
        message: `Low confidence (${match.confidence}): "${movie.title}" → "${match.title}"`,
      }
    }

    console.log(`[TMDB Enrich] Matched: "${movie.title}" → TMDB ${match.tmdbId} (${match.confidence} via ${match.matchMethod})`)

    // 2. Fetch enrichment data
    const fieldsUpdated: string[] = []
    const updateData: Record<string, unknown> = {
      tmdbId: match.tmdbId,
      matchConfidence: match.confidence,
    }
    fieldsUpdated.push('tmdbId', 'matchConfidence')

    // 2a. External IDs (IMDB)
    try {
      const extIds = await getExternalIds(match.tmdbId, match.mediaType)
      if (extIds.imdb_id) {
        updateData.imdbId = extIds.imdb_id
        fieldsUpdated.push('imdbId')
      }
    } catch (e) {
      console.warn(`[TMDB Enrich] Failed to get external IDs:`, e instanceof Error ? e.message : e)
    }

    // 2b. Videos (Trailer)
    try {
      const videos = await getVideos(match.tmdbId, match.mediaType)
      const trailer = pickBestTrailer(videos.results)
      if (trailer) {
        updateData.trailerSite = trailer.site
        updateData.trailerKey = trailer.key
        updateData.trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`
        fieldsUpdated.push('trailerSite', 'trailerKey', 'trailerUrl')
      }
    } catch (e) {
      console.warn(`[TMDB Enrich] Failed to get videos:`, e instanceof Error ? e.message : e)
    }

    // 2c. Credits (Cast + Directors)
    let castNames: string[] = []
    let directorNames: string[] = []
    try {
      const credits = await getCredits(match.tmdbId, match.mediaType)

      // Top 10 cast
      const topCast = credits.cast.slice(0, 10)
      for (let i = 0; i < topCast.length; i++) {
        const c = topCast[i]
        const personId = await upsertPerson(c.id, c.name, c.profile_path, c.gender, c.known_for_department, c.popularity)
        await upsertMoviePerson(movieId, personId, 'actor', c.character, i)
        castNames.push(c.name)
      }

      // Directors
      const directors = credits.crew.filter(c => c.job === 'Director')
      for (let i = 0; i < directors.length; i++) {
        const d = directors[i]
        const personId = await upsertPerson(d.id, d.name, d.profile_path, d.gender, d.known_for_department, d.popularity)
        await upsertMoviePerson(movieId, personId, 'director', null, i)
        directorNames.push(d.name)
      }

      if (castNames.length > 0) {
        updateData.actorText = castNames.join(', ')
        fieldsUpdated.push('actorText')
      }
      if (directorNames.length > 0) {
        updateData.directorText = directorNames.join(', ')
        fieldsUpdated.push('directorText')
      }
    } catch (e) {
      console.warn(`[TMDB Enrich] Failed to get credits:`, e instanceof Error ? e.message : e)
    }

    // 2d. Backdrop (only if missing)
    if (!movie.backdropUrl) {
      try {
        // Use search result data — we need to re-fetch detail for backdrop
        const detail = match.mediaType === 'movie'
          ? await (await import('./tmdb-client')).getMovieDetail(match.tmdbId)
          : await (await import('./tmdb-client')).getTvDetail(match.tmdbId)

        const backdropPath = 'backdrop_path' in detail ? detail.backdrop_path : null
        if (backdropPath) {
          updateData.backdropUrl = buildImageUrl(backdropPath, 'w1280')
          fieldsUpdated.push('backdropUrl')
        }
      } catch (e) {
        console.warn(`[TMDB Enrich] Failed to get detail for backdrop:`, e instanceof Error ? e.message : e)
      }
    }

    // 3. Update movie
    // Preserve combined source: if movie was from ophim/ophim18, mark as combined
    if (movie.metadataSource === 'ophim18' || movie.metadataSource === 'ophim') {
      updateData.metadataSource = `${movie.metadataSource}+tmdb`
    } else if (!movie.metadataSource?.includes('tmdb')) {
      updateData.metadataSource = 'tmdb'
    }
    updateData.lastSyncedAt = new Date()

    await prisma.movie.update({ where: { id: movieId }, data: updateData })

    // 4. Log success
    const msg = `Enriched "${movie.title}" with ${fieldsUpdated.length} fields (confidence: ${match.confidence})`
    await addSyncLog(jobId, movieId, 'enrich', 'success', msg, {
      tmdbId: match.tmdbId, confidence: match.confidence, method: match.matchMethod,
      fields: fieldsUpdated, cast: castNames.length, directors: directorNames.length,
    })

    if (isOwnJob) await completeSyncJob(jobId, { total: 1, processed: 1, failed: 0, skipped: 0 })

    return {
      movieId, movieTitle: movie.title, action: 'enrich',
      tmdbId: match.tmdbId, confidence: match.confidence, matchMethod: match.matchMethod,
      fieldsUpdated, message: msg,
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await addSyncLog(jobId, movieId, 'fail', 'error', `Enrichment failed: ${errorMsg}`, { movieId, error: errorMsg })
    if (isOwnJob) await failSyncJob(jobId, errorMsg)
    return { movieId, movieTitle: movieId, action: 'fail', message: `Failed: ${errorMsg}`, error: errorMsg }
  }
}

/**
 * Batch enrich movies that are missing TMDB metadata.
 * @param limit Max number of movies to process
 * @param delayMs Delay between TMDB API calls to respect rate limits
 */
export async function enrichBatch(limit: number = 20, delayMs: number = 800): Promise<{ jobId: string; results: EnrichResult[] }> {
  const job = await createSyncJob('incremental', { limit })
  const results: EnrichResult[] = []
  const stats = { total: 0, processed: 0, failed: 0, skipped: 0 }

  try {
    // Find movies needing enrichment: no tmdbId or no trailer or no backdrop
    const movies = await prisma.movie.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          { tmdbId: null },
          { trailerUrl: null },
          { backdropUrl: null },
        ],
      },
      select: { id: true, title: true, tmdbId: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    console.log(`[TMDB Enrich] Found ${movies.length} movies needing enrichment`)
    stats.total = movies.length

    for (const movie of movies) {
      if (results.length > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }

      const result = await enrichMovie(movie.id, job.id)
      results.push(result)

      switch (result.action) {
        case 'enrich': stats.processed++; break
        case 'skip': stats.skipped++; break
        case 'fail': stats.failed++; break
      }

      if (stats.total > 0 && (stats.processed + stats.skipped + stats.failed) % 5 === 0) {
        console.log(`[TMDB Enrich] Progress: ${stats.processed} enriched, ${stats.skipped} skipped, ${stats.failed} failed / ${stats.total}`)
      }
    }

    await completeSyncJob(job.id, stats)

    console.log(`\n[TMDB Enrich] ✅ Completed!`)
    console.log(`  Enriched: ${stats.processed}`)
    console.log(`  Skipped: ${stats.skipped}`)
    console.log(`  Failed: ${stats.failed}`)
    console.log(`  Total: ${stats.total}`)

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await failSyncJob(job.id, errorMsg)
    console.error(`[TMDB Enrich] ❌ Job failed: ${errorMsg}`)
  }

  return { jobId: job.id, results }
}

export async function disconnect() {
  await prisma.$disconnect()
}
