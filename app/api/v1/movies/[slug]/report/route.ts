import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/src/be/shared/db/prisma'
import { getMovieBySlug } from '@/src/be/modules/movies/movie-service'
import { z } from 'zod'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'movies-slug-report' })

const reportSchema = z.object({
  episodeSlug: z.string().optional(),
  reason: z.string().min(1, 'Vui lòng chọn lý do báo cáo'),
  details: z.string().optional(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const session = await getServerSession(authOptions)
    
    // We allow anonymous reports, but if session exists, we use it.
    const userId = session?.user?.id ?? null

    const body = await req.json()
    const parsed = reportSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const movie = await getMovieBySlug(slug)
    if (!movie) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy bộ phim' }, { status: 404 })
    }

    const { episodeSlug, reason, details } = parsed.data

    // Check rate limit: if logged in, limit 5 reports per user/movie per day to avoid spam.
    if (userId) {
      const recentReports = await prisma.movieReport.count({
        where: {
          userId,
          movieId: movie.id,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
      if (recentReports >= 5) {
        return NextResponse.json({ success: false, error: 'Bạn đã báo cáo quá nhiều lần hôm nay' }, { status: 429 })
      }
    }

    const report = await prisma.movieReport.create({
      data: {
        movieId: movie.id,
        userId: userId,
        episodeSlug,
        reason,
        details,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ kiểm tra và khắc phục sớm nhất!',
      data: report
    })
  } catch (error: any) {
    log.error({ err: error instanceof Error ? error.message : error }, 'Report Movie Error')
    return NextResponse.json({ success: false, error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
