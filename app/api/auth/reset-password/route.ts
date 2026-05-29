import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { AuthService } from '@/src/be/modules/auth'
import { logger } from '@/src/be/shared/utils/logger'
import { resetPasswordSchema } from '@/src/be/modules/auth/auth.schema'

const log = logger.child({ module: 'auth-reset-password' })

export async function POST(req: NextRequest) {
  try {
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = resetPasswordSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' }, { status: 400 })
    }
    const { token, password } = parsed.data

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!resetToken) {
      return NextResponse.json({ error: 'Token không hợp lệ hoặc đã được sử dụng' }, { status: 400 })
    }

    if (resetToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } })
      return NextResponse.json({ error: 'Token đã hết hạn' }, { status: 400 })
    }

    const hashedPassword = await AuthService.hashPassword(password)

    // Update password and clean up all reset tokens for this user
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: hashedPassword }
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId }
      })
    ])

    return NextResponse.json({ message: 'Đặt lại mật khẩu thành công' })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'Reset password error')
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
