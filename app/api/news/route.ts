// ============================================
// API Route: GET /api/news
// ============================================

import { NextRequest } from 'next/server'
import { NewsController } from '@/src/be/modules/news/news.controller'

export async function GET(req: NextRequest) {
  return NewsController.getTopNews(req)
}
