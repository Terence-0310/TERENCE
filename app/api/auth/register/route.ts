import { NextRequest, NextResponse } from "next/server";
import { signup } from "@/src/be/modules/auth/auth.controller";
import { logger } from '@/src/be/shared/utils/logger'
import { rateLimit, getClientIdentifier } from '@/src/be/shared/rate-limit'

const log = logger.child({ module: 'auth-register' })
const limiter = rateLimit({ windowMs: 60_000, maxRequests: 5 })

export async function POST(req: NextRequest) {
  const { allowed } = await limiter.check(`auth-register:${getClientIdentifier(req)}`)
  if (!allowed) {
    return NextResponse.json({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.' }, { status: 429 })
  }

  try {
    const body = await req.json();
    return await signup(body);
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'Register Error')
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
