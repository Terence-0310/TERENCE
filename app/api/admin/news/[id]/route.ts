import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin, logAdminAction } from '@/src/be/modules/admin/admin.utils'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'admin-news-id' })

// Whitelist fields allowed for PATCH. Prevents mass-assignment of
// authorId, createdAt, updatedAt, viewCount, id, etc.
const newsUpdateSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  slug: z.string().trim().min(1).max(300).optional(),
  excerpt: z.string().trim().max(1000).nullable().optional(),
  content: z.string().nullable().optional(),
  coverImage: z.string().trim().url().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  tags: z.string().nullable().optional(),
  publishedAt: z.union([z.string().datetime(), z.null()]).optional(),
})
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' })

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin('news.manage')
    if ('error' in auth) return auth.error
    const { id } = await params

    const post = await prisma.newsPost.findUnique({ where: { id } })
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: post })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'GET /admin/news/[id] error')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin('news.manage')
    if ('error' in auth) return auth.error
    const { id } = await params

    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = newsUpdateSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', issues: parsed.error.issues },
        { status: 400 },
      )
    }

    // Map publishedAt string → Date for Prisma (whitelist guarantees only safe fields here).
    const { publishedAt, ...rest } = parsed.data
    const data: Record<string, unknown> = { ...rest }
    if (publishedAt !== undefined) {
      data.publishedAt = publishedAt === null ? null : new Date(publishedAt)
    }

    const post = await prisma.newsPost.update({ where: { id }, data })
    await logAdminAction(auth.userId, 'update', 'news', id, { title: post.title, status: post.status })
    return NextResponse.json(post)
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'PATCH /admin/news/[id] error')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin('news.delete')
    if ('error' in auth) return auth.error
    const { id } = await params
    await prisma.newsPost.delete({ where: { id } })
    await logAdminAction(auth.userId, 'delete', 'news', id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'DELETE /admin/news/[id] error')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
