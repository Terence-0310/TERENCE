import { NextRequest } from 'next/server'
import { requireAdmin, errorResponse, successResponse } from '@/src/be/modules/admin/api-helpers'
import { handleMovieMediaUpload, deleteUploadedFile, isManagedUploadUrl } from '@/src/be/modules/uploads/legacy-upload'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { prisma } from '@/src/be/shared/db/prisma'

// POST /api/admin/uploads/movie-backdrop — upload backdrop image for a movie
export async function POST(req: NextRequest) {
  const auth = await requireAdmin('upload.manage')
  if (auth instanceof Response) return auth

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const movieId = formData.get('movieId') as string | null

    if (!file) return errorResponse('Chưa chọn file')
    if (!movieId) return errorResponse('movieId là bắt buộc')

    const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true, title: true, backdropUrl: true } })
    if (!movie) return errorResponse('Không tìm thấy phim', 404)

    // Upload backdrop
    const result = await handleMovieMediaUpload(file, movieId, 'backdrop', auth.user.email)

    // Delete old backdrop if local
    if (isManagedUploadUrl(movie.backdropUrl)) {
      await deleteUploadedFile(movie.backdropUrl)
    }

    // Update movie.backdropUrl
    await prisma.movie.update({
      where: { id: movieId },
      data: { backdropUrl: result.url, updatedBy: auth.user.email },
    })

    await logAdminAction({
      actorId: auth.user.email, action: 'upload', targetType: 'movie', targetId: movieId,
      metadata: { field: 'backdropUrl', fileName: result.fileName, size: result.size, oldUrl: movie.backdropUrl },
      ipAddress: getClientIp(req.headers),
    })

    return successResponse({ url: result.url, fileName: result.fileName, size: result.size }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload thất bại'
    return errorResponse(message)
  }
}
