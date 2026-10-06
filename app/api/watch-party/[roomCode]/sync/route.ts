// ============================================
// GET  /api/watch-party/[roomCode]/sync
// POST /api/watch-party/[roomCode]/sync
// REST fallback for playback state sync.
// Primary channel is Socket.IO (wp:play / wp:pause / wp:seek events).
// Use GET to poll current state, POST to push a state update (host only).
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import * as service from '@/src/be/modules/watch-party/watch-party.service'
import { WatchPartyError } from '@/src/be/modules/watch-party/watch-party.service'
import { AuthService } from '@/src/be/modules/auth'

interface RouteContext {
  params: Promise<{ roomCode: string }>
}

// GET /api/watch-party/[roomCode]/sync
// Returns the current playback state of the room.
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { roomCode } = await context.params
    if (!roomCode) {
      return NextResponse.json({ error: 'roomCode is required' }, { status: 400 })
    }

    const room = await service.getRoom(roomCode.toUpperCase())

    return NextResponse.json({
      state: room.state
        ? {
            playbackTime: room.state.playbackTime,
            isPlaying: room.state.isPlaying,
            playbackRate: room.state.playbackRate,
            episodeId: room.state.episodeId,
            lastEventType: room.state.lastEventType,
            lastEventBy: room.state.lastEventBy,
            version: room.state.version,
            updatedAt: room.state.updatedAt,
          }
        : null,
    })
  } catch (err: unknown) {
    if (err instanceof WatchPartyError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === 'ROOM_NOT_FOUND' ? 404 : 400 },
      )
    }
    const message = err instanceof Error ? err.message : 'Failed to get sync state'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/watch-party/[roomCode]/sync
// Body: { eventBy, eventType, playbackTime?, isPlaying?, playbackRate?, episodeId? }
// eventType: 'PLAY' | 'PAUSE' | 'SEEK' | 'SYNC'
// eventBy: participantId of the caller (must be HOST for PLAY/PAUSE/SEEK)
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { roomCode } = await context.params
    if (!roomCode) {
      return NextResponse.json({ error: 'roomCode is required' }, { status: 400 })
    }

    const body = await request.json()
    const { eventBy, eventType, playbackTime, isPlaying, playbackRate, episodeId } = body

    if (!eventBy || !eventType) {
      return NextResponse.json(
        { error: 'eventBy and eventType are required' },
        { status: 400 },
      )
    }

    const state = await service.syncState({
      roomCode: roomCode.toUpperCase(),
      eventBy,
      eventType,
      playbackTime,
      isPlaying,
      playbackRate,
      episodeId,
      callerUserId: (await AuthService.getCurrentUser())?.id || null,
    })

    return NextResponse.json({
      state: {
        playbackTime: state.playbackTime,
        isPlaying: state.isPlaying,
        playbackRate: state.playbackRate,
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
        { status: statusMap[err.code] ?? 400 },
      )
    }
    const message = err instanceof Error ? err.message : 'Failed to sync state'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
