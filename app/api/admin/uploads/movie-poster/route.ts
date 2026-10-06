import { NextRequest } from 'next/server'
import { requireAdmin, errorResponse, successResponse } from '@/src/be/modules/admin/api-helpers'
import { handleMovieMediaUpload, deleteUploadedFile } from '@/src/be/modules/uploads/legacy-upload'
import { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
import { prisma } from '@/src/be/shared/db/prisma'

// POST /api/admin/uploads/movie-poster — upload poster image for a movie
export async function POST(req: NextRequest) {
  const auth = await requireAdmin('upload.manage')
  if (auth instanceof Response) return auth

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const movieId = formData.get('movieId') as string | null

    if (!file) return errorResponse('Chưa chọn file')
    if (!movieId) return errorResponse('movieId là bắt buộc')

    const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true, title: true, posterUrl: true } })
    if (!movie) return errorResponse('Không tìm thấy phim', 404)

    // Upload poster
    const result = await handleMovieMediaUpload(file, movieId, 'poster', auth.user.email)

    // Delete old poster if local
    if (movie.posterUrl && movie.posterUrl.startsWith('/uploads/')) {
      await deleteUploadedFile(movie.posterUrl)
    }

    // Update movie.posterUrl
    await prisma.movie.update({
      where: { id: movieId },
      data: { posterUrl: result.url, updatedBy: auth.user.email },
    })

    await logAdminAction({
      actorId: auth.user.email, action: 'upload', targetType: 'movie', targetId: movieId,
      metadata: { field: 'posterUrl', fileName: result.fileName, size: result.size, oldUrl: movie.posterUrl },
      ipAddress: getClientIp(req.headers),
    })

    return successResponse({ url: result.url, fileName: result.fileName, size: result.size }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload thất bại'
    return errorResponse(message)
  }
}
