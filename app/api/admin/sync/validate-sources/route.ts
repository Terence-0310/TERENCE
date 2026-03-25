// ============================================
// POST /api/admin/sync/validate-sources — Validate Movie Sources
// ============================================

import { NextResponse } from 'next/server'
import { requireAdmin, isUser } from '@/src/server/admin/admin-guard'
import { prisma } from '@/lib/db/prisma'

export async function POST() {
  const guard = await requireAdmin()
  if (!isUser(guard)) return guard

  try {
    // Create SyncJob for source validation
    const job = await prisma.syncJob.create({
      data: {
        source: 'system',
        jobType: 'validate_sources',
        status: 'running',
        startedAt: new Date(),
      },
    })

    // Get all active movie sources
    const sources = await prisma.movieSource.findMany({
      where: { isActive: true },
      include: { movie: { select: { id: true, title: true } } },
    })

    let checked = 0
    let broken = 0
    let ok = 0

    for (const source of sources) {
      checked++
      let isBroken = false

      // Check if sourceUrl exists and is reachable (basic HEAD check)
      if (source.sourceUrl) {
        try {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 5000)
          const res = await fetch(source.sourceUrl, {
            method: 'HEAD',
            signal: controller.signal,
            redirect: 'follow',
          })
          clearTimeout(timer)
          if (!res.ok && res.status !== 403) {
            // 403 is common for protected CDN URLs, not necessarily broken
            isBroken = true
          }
        } catch {
          isBroken = true
        }
      }

      // Also check: episodes with this source that have no streamUrl
      const brokenEpisodes = await prisma.episode.count({
        where: {
          movieId: source.movieId,
          sourceName: source.sourceName,
          isActive: true,
          OR: [
            { streamUrl: null },
            { streamUrl: '' },
          ],
        },
      })

      if (brokenEpisodes > 0) {
        isBroken = true
      }

      if (isBroken) {
        broken++
        await prisma.movieSource.update({
          where: { id: source.id },
          data: { isActive: false, lastChecked: new Date() },
        })
        await prisma.syncLog.create({
          data: {
            syncJobId: job.id,
            movieId: source.movieId,
            source: 'system',
            action: 'validate',
            status: 'warning',
            message: `Source "${source.sourceName}" marked inactive for "${source.movie.title}"${brokenEpisodes > 0 ? ` (${brokenEpisodes} episodes missing streamUrl)` : ' (URL unreachable)'}`,
          },
        })
      } else {
        ok++
        await prisma.movieSource.update({
          where: { id: source.id },
          data: { lastChecked: new Date() },
        })
      }
    }

    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        totalItems: checked,
        processedItems: ok,
        failedItems: broken,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        checked,
        ok,
        broken,
        message: `Validated ${checked} sources: ${ok} ok, ${broken} broken`,
      },
    })
  } catch (error) {
    console.error('[Admin] Validate sources error:', error)
    return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 500 })
  }
}
