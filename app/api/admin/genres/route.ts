// GET /api/admin/genres — list all genres
// POST /api/admin/genres — create genre

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin, logAdminAction, paginatedResponse } from '@/src/be/modules/admin/admin.utils'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin('editor')
  if ('error' in auth) return auth.error

  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page')) || 1
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
  const search = searchParams.get('search') || ''

  const where: any = {}
  if (search) where.name = { contains: search, mode: 'insensitive' }

  const skip = (page - 1) * limit
  const [genres, total] = await Promise.all([
    prisma.genre.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
      include: { _count: { select: { movies: true } } },
    }),
    prisma.genre.count({ where }),
  ])

  return NextResponse.json(paginatedResponse(genres, total, page, limit))
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin('editor')
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { name, slug } = body
  if (!name || !slug) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })
  }

  const genre = await prisma.genre.create({ data: { name, slug } })
  await logAdminAction(auth.userId, 'create', 'genre', genre.id, { name, slug })
  return NextResponse.json(genre, { status: 201 })
}
