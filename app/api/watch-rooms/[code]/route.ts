import { NextRequest, NextResponse } from 'next/server'
import { getMembers, getMessages, getRoomByCode, updatePlayback } from '@/lib/watch-party/store'

type RouteContext = { params: Promise<{ code: string }> }

export async function GET(_req: NextRequest, context: RouteContext) {
  const { code } = await context.params
  const room = getRoomByCode(code)
  if (!room) {
    return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })
  }

  const members = getMembers(code)
  const recentMessages = getMessages(code, 100)

  return NextResponse.json({ room, members, messages: recentMessages })
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { code } = await context.params
  const body = await req.json()
  const updated = updatePlayback(code, {
    time: body.time,
    state: body.state,
    episodeId: body.episodeId,
    serverIndex: body.serverIndex,
  })

  if (!updated) {
    return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json({ room: updated })
}
