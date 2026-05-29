// ============================================
// DELETE /api/v1/watch-history/[id] — Remove watch record
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { deleteWatchRecord } from '@/src/be/modules/watch/watch-history-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'watch-history-id' })

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    if (!id?.trim()) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const deleted = await deleteWatchRecord(id, userId)

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    if (message.includes('Not authorized')) {
      return NextResponse.json({ success: false, error: message }, { status: 403 })
    }
    log.error({ err: error instanceof Error ? error.message : error }, '/v1/watch-history/[id] DELETE error')
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
