import { NextRequest } from 'next/server'
import { AdminController } from '@/src/be/modules/admin/admin.controller'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return AdminController.getLogs(req)
}
