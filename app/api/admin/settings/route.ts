import { NextRequest } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin, errorResponse, successResponse, parseBody } from '@/src/be/modules/admin/api-helpers'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'

// GET: Fetch all active settings, grouped optionally
export async function GET(req: NextRequest) {
  const auth = await requireAdmin('settings.read')
  if (auth instanceof Response) return auth

  const { searchParams } = new URL(req.url)
  const group = searchParams.get('group')

  const whereClause: any = {}
  if (group) whereClause.group = group

  try {
    // using raw since typescript type may not be generated yet
    const settingsList: any[] = await (prisma as any).systemSetting.findMany({
      where: whereClause,
      orderBy: { key: 'asc' }
    })

    const settings = settingsList.reduce((acc, s) => {
      acc[s.key] = s
      return acc
    }, {} as Record<string, any>)

    return successResponse({ settings })
  } catch (err: any) {
    return errorResponse(`Failed to fetch settings: ${err.message}`)
  }
}

// POST: Batch update settings
export async function POST(req: NextRequest) {
  const auth = await requireAdmin('settings.update')
  if (auth instanceof Response) return auth

  const body = await parseBody<{ updates: { key: string, value: string, group?: string, type?: string, description?: string }[] }>(req)
  if (!body || !Array.isArray(body.updates)) {
    return errorResponse('Invalid payload, updates must be an array', 400)
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const update of body.updates) {
        if (!update.key) continue;
        
        await (tx as any).systemSetting.upsert({
          where: { key: update.key },
          update: {
            value: update.value,
            updatedBy: auth.user.email,
          },
          create: {
             key: update.key,
             value: update.value,
             group: update.group || 'general',
             type: update.type || 'string',
             description: update.description,
             updatedBy: auth.user.email,
             isPublic: false
          }
        })
      }
    })

    // Log Action
    await logAdminAction({
      actorId: auth.user.email,
      action: 'update_settings',
      targetType: 'system',
      targetId: 'global',
      metadata: { changedKeys: body.updates.map(u => u.key) },
      ipAddress: getClientIp(req.headers)
    })

    return successResponse({ ok: true })
  } catch (err: any) {
    return errorResponse(`Failed to update settings: ${err.message}`)
  }
}
