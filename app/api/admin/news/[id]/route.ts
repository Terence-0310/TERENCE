import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { requireAdmin, logAdminAction } from '@/src/server/modules/admin/admin.utils'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('editor')
  if ('error' in auth) return auth.error
  const { id } = await params
  const body = await request.json()
  const post = await prisma.newsPost.update({ where: { id }, data: body })
  await logAdminAction(auth.userId, 'update', 'news', id, { title: post.title, status: body.status })
  return NextResponse.json(post)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('admin')
  if ('error' in auth) return auth.error
  const { id } = await params
  await prisma.newsPost.delete({ where: { id } })
  await logAdminAction(auth.userId, 'delete', 'news', id)
  return NextResponse.json({ ok: true })
}
