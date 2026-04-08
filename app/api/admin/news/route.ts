// GET /api/admin/news — list news posts
// POST /api/admin/news — create news post

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { requireAdmin, logAdminAction, paginatedResponse } from '@/src/server/modules/admin/admin.utils'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin('editor')
  if ('error' in auth) return auth.error

  const { searchParams } = request.nextUrl
  const page = Number(searchParams.get('page')) || 1
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50)
  const status = searchParams.get('status') || ''
  const search = searchParams.get('search') || ''

  const where: any = {}
  if (status) where.status = status
  if (search) where.title = { contains: search, mode: 'insensitive' }

  const skip = (page - 1) * limit
  const [posts, total] = await Promise.all([
    prisma.newsPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.newsPost.count({ where }),
  ])

  return NextResponse.json(paginatedResponse(posts, total, page, limit))
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin('editor')
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { title, slug, content, excerpt, coverImage, status } = body
  if (!title || !slug || !content) {
    return NextResponse.json({ error: 'title, slug, and content are required' }, { status: 400 })
  }

  const post = await prisma.newsPost.create({
    data: {
      title,
      slug,
      content,
      excerpt: excerpt || null,
      coverImage: coverImage || null,
      status: status || 'draft',
      authorId: auth.userId,
    },
  })
  await logAdminAction(auth.userId, 'create', 'news', post.id, { title })
  return NextResponse.json(post, { status: 201 })
}
