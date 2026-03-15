import { NextRequest, NextResponse } from 'next/server'
import { leaveRoom } from '@/lib/watch-party/store'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { code, memberId } = body

  leaveRoom(code, memberId)
  return NextResponse.json({ ok: true })
}

