import { AdminController } from '@/src/be/modules/admin/admin.controller'

export async function GET() {
  return AdminController.getReports()
}
