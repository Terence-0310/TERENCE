import { NextResponse } from 'next/server'
import { reviewService } from '@/lib/services/review.service'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const result = await reviewService.getByMovie(slug, page, limit)
    
    // Transform formatting to match what UI expects easily
    const formattedData = result.data.map(r => ({
      id: r.id,
      author: r.user.name,
      avatar: r.user.avatar,
      text: r.content,
      rating: r.rating,
      date: new Date(r.createdAt).toLocaleString('vi-VN'),
      createdAt: r.createdAt
    }))

    return NextResponse.json({ success: true, data: formattedData, total: result.total })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
