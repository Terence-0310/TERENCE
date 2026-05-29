import { NextRequest, NextResponse } from "next/server";
import { signup } from "@/src/be/modules/auth/auth.controller";
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'auth-register' })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return await signup(body);
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'Register Error')
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
