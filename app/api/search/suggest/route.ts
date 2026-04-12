import { NextResponse } from 'next/server'
import { suggestMovies } from '@/src/be/modules/search/movie-search-service'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const limit = Number(searchParams.get('limit')) || 8

  if (!q) return NextResponse.json({ items: [], source: 'none' })

  const result = await suggestMovies(q, limit)
  return NextResponse.json(result)
}
