// ============================================
// POST /api/watch-party/[roomCode]/sync
// ============================================
// Updates the playback state for a watch party room.
// Body: { playbackTime?, isPlaying?, playbackRate?, eventType?, eventBy?, episodeId? }
// Returns: updated state

import { NextRequest, NextResponse } from 'next/server'
import { syncStateSchema } from '@/src/be/modules/watch-party/watch-party.schema'
import * as service from '@/src/be/modules/watch-party/watch-party.service'
import { WatchPartyError } from '@/src/be/modules/watch-party/watch-party.service'

interface RouteContext {
  params: Promise<{ roomCode: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { roomCode } = await context.params
    const body = await request.json()

    if (!roomCode) {
      return NextResponse.json({ error: 'roomCode is required' }, { status: 400 })
    }

    const parsed = syncStateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const state = await service.syncState({
      roomCode: roomCode.toUpperCase(),
      ...parsed.data,
    })

    return NextResponse.json({
      state: {
        playbackTime: state.playbackTime,
        isPlaying: state.isPlaying,
        playbackRate: state.playbackRate,
        episodeId: state.episodeId,
        lastEventType: state.lastEventType,
        lastEventBy: state.lastEventBy,
        version: state.version,
        updatedAt: state.updatedAt,
      },
    })
  } catch (err: unknown) {
    if (err instanceof WatchPartyError) {
      const statusMap: Record<string, number> = {
        ROOM_NOT_FOUND: 404,
        ROOM_ENDED: 410,
        FORBIDDEN: 403,
      }
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] || 400 },
      )
    }
    const message = err instanceof Error ? err.message : 'Failed to sync state'
    return NextResponse.json(
      { error: message },
      { status: 500 },
    )
  }
}
