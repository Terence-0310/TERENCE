import { NextRequest } from 'next/server'
import { updateRole } from '@/src/be/modules/watch-party/watch-party.controller'

export async function POST(request: NextRequest, props: { params: Promise<{ roomCode: string }> }) {
  return updateRole(request, props)
}
