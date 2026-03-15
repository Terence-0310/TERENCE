import { NextRequest, NextResponse } from 'next/server'
import { addMessage, getMessages } from '@/lib/watch-party/store'

type RouteContext = { params: Promise<{ code: string }> }

export async function GET(_req: NextRequest, context: RouteContext) {
  const { code } = await context.params
  const msgs = getMessages(code, 50)
  return NextResponse.json({ messages: msgs })
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { code } = await context.params
  const body = await req.json()
  const sender = { id: body.userId, name: body.senderName ?? 'Người dùng' }
  const msg = addMessage(code, sender, body.content)
  return NextResponse.json({ message: msg })
}
