// ============================================
// POST /api/watch-party/join
// ============================================
// Join an existing watch party room.
// Body: { roomCode, displayName, userId? }
// Returns: { room, participant, state, isRejoin }

import { NextRequest, NextResponse } from 'next/server'
import { joinRoomSchema } from '@/src/be/modules/watch-party/watch-party.schema'
import * as service from '@/src/be/modules/watch-party/watch-party.service'
import { WatchPartyError } from '@/src/be/modules/watch-party/watch-party.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = joinRoomSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await service.joinRoom(parsed.data)

    return NextResponse.json({
      room: {
        id: result.room.id,
        code: result.room.roomCode,
        title: result.room.title,
        status: result.room.status,
        movieId: result.room.movieId,
        episodeId: result.room.episodeId,
        maxMembers: result.room.maxMembers,
        roomType: result.room.maxMembers <= 2 ? 'duo' : result.room.maxMembers <= 4 ? 'small_group' : 'group_chat',
      },
      participant: {
        id: result.participant.id,
        displayName: result.participant.displayName,
        role: result.participant.role,
        isOnline: result.participant.isOnline,
      },
      state: result.state ? {
        playbackTime: result.state.playbackTime,
        isPlaying: result.state.isPlaying,
        playbackRate: result.state.playbackRate,
        episodeId: result.state.episodeId,
        version: result.state.version,
      } : null,
      isRejoin: result.isRejoin,
    })
  } catch (err: unknown) {
    if (err instanceof WatchPartyError) {
      const statusMap: Record<string, number> = {
        ROOM_NOT_FOUND: 404,
        ROOM_ENDED: 410,
      }
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] || 400 },
      )
    }
    const message = err instanceof Error ? err.message : 'Failed to join room'
    return NextResponse.json(
      { error: message },
      { status: 500 },
    )
  }
}
