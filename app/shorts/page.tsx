import type { Metadata } from 'next'
import { randomBytes } from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFeed, getShortById, type FeedTab } from '@/src/be/modules/shorts/shorts.service'
import { ShortsFeed } from '@/src/fe/components/shorts/ShortsFeed'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ v?: string; tab?: string }>
}

const TABS: FeedTab[] = ['foryou', 'latest', 'popular']

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { v } = await searchParams
  const short = v ? await getShortById(v).catch(() => null) : null
  if (short) {
    return {
      title: `${short.title} — Shorts | Terence`,
      description: short.description || `Xem video ngắn ${short.title} trên Terence`,
      openGraph: { title: short.title, images: short.thumbnailUrl ? [{ url: short.thumbnailUrl }] : [] },
    }
  }
  return {
    title: 'Shorts — Terence',
    description: 'Lướt video ngắn về phim: clip, teaser, trailer — vuốt dọc để khám phá.',
  }
}

export default async function ShortsPage({ searchParams }: PageProps) {
  const { v, tab: tabParam } = await searchParams
  const tab = TABS.find((t) => t === tabParam) ?? 'foryou'
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  // One seed per visit keeps the shuffled "Dành cho bạn" order stable while paging.
  const seed = randomBytes(6).toString('hex')

  const [pinned, feed] = await Promise.all([
    v ? getShortById(v, userId).catch(() => null) : Promise.resolve(null),
    getFeed({ tab, seed, limit: 10, userId }),
  ])
  const initial = pinned ? [pinned, ...feed.filter((s) => s.id !== pinned.id)] : feed

  return <ShortsFeed initial={initial} initialTab={tab} seed={seed} pinnedFirst={!!pinned} />
}
