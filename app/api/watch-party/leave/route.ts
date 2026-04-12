// ============================================
// POST /api/watch-party/leave
// ============================================
// Leave a watch party room. Handles host transfer.
// Body: { roomCode, participantId }
// Returns: { ok, ended, newHost? }

import { NextRequest, NextResponse } from 'next/server'
import { leaveRoomSchema } from '@/src/be/modules/watch-party/watch-party.schema'
import * as service from '@/src/be/modules/watch-party/watch-party.service'
import { WatchPartyError } from '@/src/be/modules/watch-party/watch-party.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = leaveRoomSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await service.leaveRoom(parsed.data)

    return NextResponse.json({
      ok: true,
      ended: result.ended,
      newHost: result.newHost,
    })
  } catch (err: unknown) {
    if (err instanceof WatchPartyError) {
      const status = err.code === 'ROOM_NOT_FOUND' ? 404 : err.code === 'PARTICIPANT_NOT_FOUND' ? 404 : 400
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      )
    }
    const message = err instanceof Error ? err.message : 'Failed to leave room'
    return NextResponse.json(
      { error: message },
      { status: 500 },
    )
  }
}
