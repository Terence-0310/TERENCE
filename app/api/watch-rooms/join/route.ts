import { NextRequest, NextResponse } from 'next/server'
import { joinRoom } from '@/lib/watch-party/store'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { code, password, displayName } = body

  try {
    const { room, member } = joinRoom(
      code,
      {
        id: body.userId,
        name: displayName ?? 'Khách',
      },
      { password },
    )

    return NextResponse.json({ room, member })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'JOIN_FAILED'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

