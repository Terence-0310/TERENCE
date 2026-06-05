import type { Metadata } from 'next'
import { getShorts } from '@/src/be/modules/movies/shorts.service'
import { ShortsFeed } from '@/src/fe/components/shorts/ShortsFeed'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Shorts — Terence',
  description: 'Lướt nhanh kho phim theo phong cách video ngắn: vuốt dọc để khám phá.',
}

export default async function ShortsPage() {
  const initial = await getShorts(20, 0)
  return <ShortsFeed initial={initial} />
}
