// ============================================
// DELETE /api/v1/watch-history/[id] — Remove watch record
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { deleteWatchRecord } from '@/src/server/watch/watch-history-service'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    if (!id?.trim()) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const deleted = await deleteWatchRecord(id, session.user.id)

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    if (message.includes('Not authorized')) {
      return NextResponse.json({ success: false, error: message }, { status: 403 })
    }
    console.error('[API] /v1/watch-history/[id] DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
