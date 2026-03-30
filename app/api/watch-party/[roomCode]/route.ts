// ============================================
// GET /api/watch-party/[roomCode]
// ============================================
// Returns room detail with participants, state, and recent messages.

import { NextRequest, NextResponse } from 'next/server'
import * as service from '@/server/watch-party/service'
import { WatchPartyError } from '@/server/watch-party/service'

interface RouteContext {
  params: Promise<{ roomCode: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { roomCode } = await context.params

    if (!roomCode) {
      return NextResponse.json({ error: 'roomCode is required' }, { status: 400 })
    }

    const room = await service.getRoom(roomCode.toUpperCase())

    return NextResponse.json({
      room: {
        id: room.id,
        roomCode: room.roomCode,
        title: room.title,
        status: room.status,
        movieId: room.movieId,
        episodeId: room.episodeId,
        hostUserId: room.hostUserId,
        host: room.host,
        createdAt: room.createdAt,
        lastSyncedAt: room.lastSyncedAt,
      },
      participants: room.participants.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        role: p.role,
        isOnline: p.isOnline,
        joinedAt: p.joinedAt,
      })),
      state: room.state ? {
        playbackTime: room.state.playbackTime,
        isPlaying: room.state.isPlaying,
        playbackRate: room.state.playbackRate,
        episodeId: room.state.episodeId,
        lastEventType: room.state.lastEventType,
        lastEventBy: room.state.lastEventBy,
        version: room.state.version,
        updatedAt: room.state.updatedAt,
      } : null,
    })
  } catch (err: unknown) {
    if (err instanceof WatchPartyError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === 'ROOM_NOT_FOUND' ? 404 : 400 },
      )
    }
    const message = err instanceof Error ? err.message : 'Failed to get room'
    return NextResponse.json(
      { error: message },
      { status: 500 },
    )
  }
}
