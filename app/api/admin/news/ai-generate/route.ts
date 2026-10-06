// POST /api/admin/news/ai-generate
// Admin: pull a batch of movies from TMDB and generate one NewsPost per movie
// via Gemini. Idempotent on slug — re-running is safe.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  generateNewsBatch,
  type AiGenerationSource,
} from '@/src/be/modules/news/ai-news-generator'
import { requireAdmin, logAdminAction } from '@/src/be/modules/admin/admin.utils'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'admin-news-ai-generate' })

const schema = z.object({
  source: z.enum(['now_playing', 'popular', 'top_rated', 'upcoming']).optional(),
  count: z.number().int().min(1).max(20).optional(),
}).strict()

export async function POST(req: NextRequest) {
  const auth = await requireAdmin('news.manage')
  if ('error' in auth) return auth.error

  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const source: AiGenerationSource = parsed.data.source ?? 'now_playing'
  const count = parsed.data.count ?? 5

  try {
    const result = await generateNewsBatch({ source, count, authorId: null })
    await logAdminAction(auth.userId, 'ai-generate', 'news', undefined, {
      source,
      requested: count,
      created: result.created.length,
      skipped: result.skipped.length,
      errors: result.errors.length,
    })
    return NextResponse.json({
      ok: true,
      summary: {
        source,
        requested: count,
        created: result.created.length,
        skipped: result.skipped.length,
        errors: result.errors.length,
      },
      result,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error({ err: message, source }, 'AI generation failed')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
