// ============================================
// /api/v1/favorites — user's favorite movies
// ============================================
// GET                 → list the current user's favorites (movie cards)
// GET ?movieId=<ref>   → { favorited: boolean } for one movie
// POST { movieId }     → toggle favorite, returns { favorited }
//
// `movieId` may be a DB cuid, a slug, or a TMDB numeric id — resolved to the
// real Movie.id so it works from any page (same approach as reviews).

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function resolveMovieId(ref: string): Promise<string | null> {
  const movie = await prisma.movie.findFirst({
    where: {
      OR: [
        { id: ref },
        { slug: ref },
        ...(/^\d+$/.test(ref) ? [{ tmdbId: Number(ref) }] : []),
      ],
      deletedAt: null,
    },
    select: { id: true },
  })
  return movie?.id ?? null
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })

    const ref = req.nextUrl.searchParams.get('movieId')?.trim()
    if (ref) {
      const movieId = await resolveMovieId(ref)
      if (!movieId) return NextResponse.json({ success: true, favorited: false })
      const fav = await prisma.favorite.findUnique({
        where: { userId_movieId: { userId, movieId } },
        select: { id: true },
      })
      return NextResponse.json({ success: true, favorited: !!fav })
    }

    // Full list — newest first.
    const favorites = await prisma.favorite.findMany({
      where: { userId, movie: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        movie: {
          select: {
            id: true, slug: true, title: true, originalTitle: true, year: true,
            posterUrl: true, thumbUrl: true, rating: true, contentType: true, tmdbId: true,
          },
        },
      },
    })
    return NextResponse.json({ success: true, data: favorites.map((f) => ({ ...f.movie, favoritedAt: f.createdAt })) })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ success: false, error: 'Vui lòng đăng nhập để lưu phim yêu thích' }, { status: 401 })

    const body = await req.json().catch(() => null)
    const ref = typeof body?.movieId === 'string' ? body.movieId.trim() : ''
    if (!ref) return NextResponse.json({ success: false, error: 'Thiếu movieId' }, { status: 400 })

    const movieId = await resolveMovieId(ref)
    if (!movieId) return NextResponse.json({ success: false, error: 'Phim không tồn tại' }, { status: 404 })

    // Toggle: remove if present, otherwise add.
    const existing = await prisma.favorite.findUnique({
      where: { userId_movieId: { userId, movieId } },
      select: { id: true },
    })
    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } })
      return NextResponse.json({ success: true, favorited: false })
    }
    await prisma.favorite.create({ data: { userId, movieId } })
    return NextResponse.json({ success: true, favorited: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 })
  }
}
