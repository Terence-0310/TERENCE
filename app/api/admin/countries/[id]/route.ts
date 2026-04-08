import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/auth/db'
import { requireAdmin, logAdminAction } from '@/src/server/modules/admin/admin.utils'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('editor')
  if ('error' in auth) return auth.error
  const { id } = await params
  const body = await request.json()
  const country = await prisma.country.update({ where: { id }, data: body })
  await logAdminAction(auth.userId, 'update', 'country', id, body)
  return NextResponse.json(country)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin('admin')
  if ('error' in auth) return auth.error
  const { id } = await params
  await prisma.movieCountry.deleteMany({ where: { countryId: id } })
  await prisma.country.delete({ where: { id } })
  await logAdminAction(auth.userId, 'delete', 'country', id)
  return NextResponse.json({ ok: true })
}
