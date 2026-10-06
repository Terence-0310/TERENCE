// ============================================
// GET  /api/watch-party/[roomCode]/messages
// POST /api/watch-party/[roomCode]/messages
// REST fallback for chat history and sending messages.
// Primary channel is Socket.IO (chat:message / chat:join events).
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import * as service from '@/src/be/modules/watch-party/watch-party.service'
import { WatchPartyError } from '@/src/be/modules/watch-party/watch-party.service'
import * as repo from '@/src/be/modules/watch-party/watch-party.repository'

interface RouteContext {
  params: Promise<{ roomCode: string }>
}

const MAX_MESSAGE_LENGTH = 1000

// GET /api/watch-party/[roomCode]/messages?limit=50&since=<ISO>
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { roomCode } = await context.params
    if (!roomCode) {
      return NextResponse.json({ error: 'roomCode is required' }, { status: 400 })
    }

    const { searchParams } = request.nextUrl
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
    const since = searchParams.get('since')

    const messages = since
      ? await service.getNewMessages(roomCode.toUpperCase(), new Date(since))
      : await service.getMessages(roomCode.toUpperCase(), limit)

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        roomId: m.roomId,
        senderId: m.participantId,
        senderName: m.senderName,
        type: m.type,
        content: m.content,
        createdAt: m.createdAt,
      })),
      count: messages.length,
    })
  } catch (err: unknown) {
    if (err instanceof WatchPartyError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === 'ROOM_NOT_FOUND' ? 404 : 400 },
      )
    }
    const message = err instanceof Error ? err.message : 'Failed to get messages'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/watch-party/[roomCode]/messages
// Body: { participantId, content }
// senderName is derived server-side from the participant record — client-supplied values are ignored.
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { roomCode } = await context.params
    if (!roomCode) {
      return NextResponse.json({ error: 'roomCode is required' }, { status: 400 })
    }

    const body = await request.json()
    const { participantId, content } = body

    if (typeof participantId !== 'string' || !participantId) {
      return NextResponse.json(
        { error: 'participantId is required' },
        { status: 400 },
      )
    }

    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 },
      )
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `content exceeds ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 },
      )
    }

    // Validate participant exists and belongs to this room.
    const room = await service.getRoom(roomCode.toUpperCase())
    const participant = await repo.findParticipantById(participantId)
    if (!participant || participant.roomId !== room.id) {
      return NextResponse.json(
        { error: 'Participant not found in this room' },
        { status: 403 },
      )
    }

    if (participant.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Participant is not active in this room' },
        { status: 403 },
      )
    }

    // Anti-spoofing: if the participant is bound to a registered user, the request
    // must come from a session matching that user. Guest participants (userId == null)
    // are accepted without a session but cannot impersonate a registered user.
    let sessionUserId: string | null = null
    if (participant.userId) {
      const session = await getServerSession(authOptions)
      sessionUserId = session?.user?.id ?? null
      if (sessionUserId !== participant.userId) {
        return NextResponse.json(
          { error: 'Forbidden: session does not match participant' },
          { status: 403 },
        )
      }
    }

    const msg = await service.sendMessage({
      roomCode: roomCode.toUpperCase(),
      participantId: participant.id,
      senderName: participant.displayName,
      content: content.trim(),
      callerUserId: sessionUserId,
    })

    return NextResponse.json(
      {
        message: {
          id: msg.id,
          roomId: msg.roomId,
          senderId: msg.participantId,
          senderName: msg.senderName,
          type: msg.type,
          content: msg.content,
          createdAt: msg.createdAt,
        },
      },
      { status: 201 },
    )
  } catch (err: unknown) {
    if (err instanceof WatchPartyError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === 'ROOM_NOT_FOUND' ? 404 : 400 },
      )
    }
    const message = err instanceof Error ? err.message : 'Failed to send message'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
