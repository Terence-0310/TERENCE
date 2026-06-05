// ============================================
// GET /api/v1/thumbnails — seek-bar preview sprite + VTT
// ============================================
// Query: movieId (DB id or slug, required), ep (episode slug, optional)
//
// Returns the cached sprite+VTT urls when ready. When none exists yet it
// resolves the episode's stream URL FROM THE DB (never a client-supplied url,
// to avoid SSRF) and kicks off generation in the background, replying
// `generating` so the client can poll.

import { NextRequest } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { getThumbnailStatus, generateThumbnails } from '@/src/be/modules/watch/thumbnail.service'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'thumbnails-route' })

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const movieRef = sp.get('movieId')?.trim()
    const ep = sp.get('ep')?.trim() || null
    if (!movieRef) {
      return Response.json({ success: false, error: 'movieId required' }, { status: 400 })
    }

    // Resolve the movie by DB id OR slug so the player can pass either.
    const movie = await prisma.movie.findFirst({
      where: { OR: [{ id: movieRef }, { slug: movieRef }], deletedAt: null },
      select: { id: true },
    })
    if (!movie) {
      return Response.json({ success: true, data: { status: 'none' } })
    }

    // Already cached / in progress?
    const status = await getThumbnailStatus(movie.id, ep)
    if (status.status !== 'none') {
      return Response.json({ success: true, data: status })
    }

    // Resolve the stream URL server-side (no client url → no SSRF surface).
    const episode = await prisma.episode.findFirst({
      where: {
        movieId: movie.id,
        status: 'active',
        streamUrl: { not: null },
        ...(ep ? { slug: ep } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      select: { streamUrl: true },
    })
    const streamUrl = episode?.streamUrl
    if (!streamUrl || !/^https?:\/\//.test(streamUrl) || !streamUrl.includes('.m3u8')) {
      // Only HLS VOD is supported for frame extraction.
      return Response.json({ success: true, data: { status: 'none' } })
    }

    // Fire-and-forget generation; reply immediately so the player can poll.
    generateThumbnails(movie.id, ep, streamUrl).catch((e) =>
      log.warn({ err: e instanceof Error ? e.message : e }, 'bg thumbnail gen failed'),
    )
    return Response.json({ success: true, data: { status: 'generating' } })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'thumbnails route error')
    return Response.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
