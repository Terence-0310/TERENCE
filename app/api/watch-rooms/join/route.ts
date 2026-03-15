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
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'JOIN_FAILED' }, { status: 400 })
  }
}

