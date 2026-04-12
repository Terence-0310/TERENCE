import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, errorResponse, successResponse } from '@/src/be/modules/admin/api-helpers'
import { UploadsService } from '@/src/be/modules/uploads/uploads.service'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'

// POST /api/admin/uploads — upload file
export async function POST(req: NextRequest) {
  const auth = await requireAdmin('uploads.manage')
  if (auth instanceof Response) return auth

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const subDir = (formData.get('subDir') as string) || 'general'

    if (!file) return errorResponse('No file provided')

    const result = await UploadsService.handleFileUpload(file, subDir, auth.user.email)

    await logAdminAction({
      actorId: auth.user.email, action: 'upload', targetType: 'upload',
      metadata: { fileName: result.fileName, size: result.size, mimeType: result.mimeType },
      ipAddress: getClientIp(req.headers),
    })

    return successResponse(result, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    return errorResponse(message)
  }
}

// GET /api/admin/uploads — list uploads
export async function GET(req: NextRequest) {
  const auth = await requireAdmin('uploads.manage')
  if (auth instanceof Response) return auth

  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const limit = Math.min(100, parseInt(sp.get('limit') || '20', 10))
  const skip = (page - 1) * limit

  const [data, total] = await UploadsService.getPaginatedUploads(skip, limit)

  return NextResponse.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
}
