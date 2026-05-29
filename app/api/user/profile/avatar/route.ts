import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { handleFileUpload } from '@/src/be/modules/uploads/legacy-upload'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Không tìm thấy file tải lên' }, { status: 400 })

    // Use the upload helper but specify the 'avatars' subdirectory.
    // It will save to /public/uploads/avatars/
    const result = await handleFileUpload(file, 'avatars', session.user.email || userId)

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: result.url },
      select: { id: true, avatar: true }
    })

    return NextResponse.json({ url: updatedUser.avatar })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tải lên thất bại'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
