// PATCH /api/admin/genres/[id] — update genre
// DELETE /api/admin/genres/[id] — delete genre

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin, logAdminAction } from '@/src/be/modules/admin/admin.utils'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('metadata.manage')
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json()
  const genre = await prisma.genre.update({ where: { id }, data: body })
  await logAdminAction(auth.userId, 'update', 'genre', id, body)
  return NextResponse.json(genre)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('metadata.delete')
  if ('error' in auth) return auth.error
  const { id } = await params

  await prisma.movieGenre.deleteMany({ where: { genreId: id } })
  await prisma.genre.delete({ where: { id } })
  await logAdminAction(auth.userId, 'delete', 'genre', id)
  return NextResponse.json({ ok: true })
}
