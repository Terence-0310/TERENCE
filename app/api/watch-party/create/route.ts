// ============================================
// POST /api/watch-party/create
// ============================================
// Creates a new watch party room with host participant + initial state.
// Body: { title, movieId?, episodeId?, displayName, userId? }
// Returns: { room, participant, state }

import { NextRequest, NextResponse } from 'next/server'
import { createRoomSchema } from '@/server/watch-party/schemas'
import * as service from '@/server/watch-party/service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = createRoomSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await service.createRoom(parsed.data)

    return NextResponse.json({
      room: {
        id: result.room.id,
        roomCode: result.room.roomCode,
        title: result.room.title,
        status: result.room.status,
        movieId: result.room.movieId,
        episodeId: result.room.episodeId,
        createdAt: result.room.createdAt,
      },
      participant: {
        id: result.hostParticipant.id,
        displayName: result.hostParticipant.displayName,
        role: result.hostParticipant.role,
      },
      state: {
        playbackTime: result.state.playbackTime,
        isPlaying: result.state.isPlaying,
        version: result.state.version,
      },
    }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create room'
    return NextResponse.json(
      { error: message },
      { status: 500 },
    )
  }
}
