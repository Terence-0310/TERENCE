import { NextRequest } from 'next/server'
import { AdminController } from '@/src/be/modules/admin/admin.controller'

export async function GET(_req?: NextRequest) {
  return AdminController.getSummary()
}
