import { NextRequest, NextResponse } from 'next/server'
import { createRoom, listRooms } from '@/lib/watch-party/store'
import type { WatchRoomType, WatchRoomVisibility } from '@/lib/watch-party/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const visibility = searchParams.get('visibility') as WatchRoomVisibility | null
  const roomType = searchParams.get('roomType') as WatchRoomType | null

  const rooms = listRooms({
    visibility: visibility ?? undefined,
    roomType: roomType ?? undefined,
    limit: 50,
  })

  return NextResponse.json({ rooms })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const host = {
    id: body.hostId ?? 'demo-host',
    name: body.hostName ?? 'Người tạo phòng',
  }

  const { room, hostMember } = createRoom(
    {
      roomName: body.roomName,
      roomType: body.roomType ?? 'small_group',
      visibility: body.visibility ?? 'public',
      movieId: body.movieId,
      movieSlug: body.movieSlug,
      movieTitle: body.movieTitle,
      episodeId: body.episodeId,
      episodeName: body.episodeName,
      serverIndex: body.serverIndex,
      maxMembers: body.maxMembers ?? 10,
      allowMemberControl: body.allowMemberControl ?? false,
      chatEnabled: body.chatEnabled ?? true,
      reactionsEnabled: body.reactionsEnabled ?? true,
      password: body.password,
      scheduledAt: body.scheduledAt,
      posterUrl: body.posterUrl,
    },
    host,
  )

  return NextResponse.json({ room, hostMember })
}
