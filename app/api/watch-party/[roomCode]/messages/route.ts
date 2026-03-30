// ============================================
// GET  /api/watch-party/[roomCode]/messages — get chat history
// POST /api/watch-party/[roomCode]/messages — send a message
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { sendMessageSchema } from '@/server/watch-party/schemas'
import * as service from '@/server/watch-party/service'
import { WatchPartyError } from '@/server/watch-party/service'

interface RouteContext {
  params: Promise<{ roomCode: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { roomCode } = await context.params
    const { searchParams } = request.nextUrl
    const since = searchParams.get('since')

    let messages
    if (since) {
      // Polling: get only new messages since timestamp
      messages = await service.getNewMessages(roomCode.toUpperCase(), new Date(since))
    } else {
      messages = await service.getMessages(roomCode.toUpperCase())
    }

    return NextResponse.json({ messages })
  } catch (err: unknown) {
    if (err instanceof WatchPartyError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === 'ROOM_NOT_FOUND' ? 404 : 400 },
      )
    }
    return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { roomCode } = await context.params
    const body = await request.json()

    const parsed = sendMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const message = await service.sendMessage({
      roomCode: roomCode.toUpperCase(),
      ...parsed.data,
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof WatchPartyError) {
      const status = err.code === 'ROOM_NOT_FOUND' ? 404 : err.code === 'ROOM_ENDED' ? 410 : 400
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
