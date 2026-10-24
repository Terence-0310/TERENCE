import { NextRequest } from 'next/server'
import { requireAdmin, errorResponse, successResponse } from '@/src/be/modules/admin/api-helpers'
import { handleMovieMediaUpload, deleteUploadedFile, isManagedUploadUrl, rejectOversizedUpload, MAX_MOVIE_IMAGE_SIZE, type MovieMediaField } from '@/src/be/modules/uploads/legacy-upload'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { prisma } from '@/src/be/shared/db/prisma'

const FIELD_MAP: Record<string, { dbField: string; mediaField: MovieMediaField }> = {
  posterUrl: { dbField: 'posterUrl', mediaField: 'poster' },
  backdropUrl: { dbField: 'backdropUrl', mediaField: 'backdrop' },
  thumbUrl: { dbField: 'thumbUrl', mediaField: 'thumbnail' },
  // Keep legacy alias for backward compat with existing UI code
  thumbnailUrl: { dbField: 'thumbUrl', mediaField: 'thumbnail' },
}

// POST /api/admin/uploads/movie-media — unified upload for poster/backdrop/thumbnail
export async function POST(req: NextRequest) {
  const auth = await requireAdmin('upload.manage')
  if (auth instanceof Response) return auth

  try {
    // Size check before formData() buffers the body.
    const tooLarge = rejectOversizedUpload(req, MAX_MOVIE_IMAGE_SIZE)
    if (tooLarge) return tooLarge
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const movieId = formData.get('movieId') as string | null
    const field = formData.get('field') as string | null

    if (!file) return errorResponse('Chưa chọn file')
    if (!movieId) return errorResponse('movieId là bắt buộc')
    if (!field || !FIELD_MAP[field]) {
      return errorResponse('field phải là: posterUrl, backdropUrl, hoặc thumbUrl')
    }

    const { dbField, mediaField } = FIELD_MAP[field]

    const movie = await prisma.movie.findUnique({ where: { id: movieId } })
    if (!movie) return errorResponse('Không tìm thấy phim', 404)

    // Upload with strict validation
    const result = await handleMovieMediaUpload(file, movieId, mediaField, auth.user.email)

    // Get old URL for cleanup
    const oldUrl = (movie as Record<string, unknown>)[dbField] as string | null

    // Update movie record
    await prisma.movie.update({
      where: { id: movieId },
      data: { [dbField]: result.url, updatedBy: auth.user.email },
    })

    // Clean up old file if local
    if (isManagedUploadUrl(oldUrl)) {
      await deleteUploadedFile(oldUrl)
    }

    await logAdminAction({
      actorId: auth.user.email, action: 'upload', targetType: 'movie', targetId: movieId,
      metadata: { field: dbField, fileName: result.fileName, size: result.size, oldUrl },
      ipAddress: getClientIp(req.headers),
    })

    return successResponse({ url: result.url, fileName: result.fileName, size: result.size, field: dbField }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload thất bại'
    return errorResponse(message)
  }
}
