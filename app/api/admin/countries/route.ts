// GET /api/admin/countries — list all countries
// POST /api/admin/countries — create country

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { requireAdmin, logAdminAction, paginatedResponse } from '@/src/server/modules/admin/admin.utils'

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
  const [countries, total] = await Promise.all([
    prisma.country.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
      include: { _count: { select: { movies: true } } },
    }),
    prisma.country.count({ where }),
  ])

  return NextResponse.json(paginatedResponse(countries, total, page, limit))
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin('editor')
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { name, slug } = body
  if (!name || !slug) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })
  }

  const country = await prisma.country.create({ data: { name, slug } })
  await logAdminAction(auth.userId, 'create', 'country', country.id, { name, slug })
  return NextResponse.json(country, { status: 201 })
}
