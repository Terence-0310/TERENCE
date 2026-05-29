// ============================================
// Verify Email API — Validates token and marks email verified
// ============================================
// GET  /api/auth/verify-email?token=xxx  — Verify email with token
// POST /api/auth/verify-email             — Resend verification email

import { NextRequest, NextResponse } from 'next/server'
import * as AuthController from '@/src/be/modules/auth/auth.controller'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'auth-verify-email' })

/** GET — Verify email using token from URL */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')?.trim() || null
    return AuthController.verifyEmail(token)
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'Verify email error')
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}

/** POST — Resend verification email */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    return AuthController.resendVerificationEmail(body)
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'Resend verification error')
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 })
  }
}
