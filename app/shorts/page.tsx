import type { Metadata } from 'next'
import { randomBytes } from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFeed, getShortById, type ShortDto } from '@/src/be/modules/shorts/shorts.service'
import { getLibraryVideo, isLibraryId, listLibrary } from '@/src/be/modules/shorts/video-library.service'
import { ShortsFeed } from '@/src/fe/components/shorts/ShortsFeed'
import { libraryToItem, type FeedTab, type LibraryStatus, type ShortItem } from '@/src/fe/components/shorts/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ v?: string; tab?: string }>
}

const TABS: FeedTab[] = ['foryou', 'latest', 'popular', 'discover']
const PAGE = 10

/** The deep-linked video (/shorts?v=…): a TERENCE short or a library video. */
async function loadPinned(v: string | undefined, userId?: string): Promise<ShortItem | null> {
  if (!v) return null
  if (isLibraryId(v)) {
    const video = await getLibraryVideo(v).catch(() => null)
    return video ? libraryToItem(video) : null
  }
  return getShortById(v, userId).catch(() => null)
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { v } = await searchParams
  const pinned = await loadPinned(v)
  if (pinned) {
    return {
      title: `${pinned.title} — Shorts | Terence`,
      description: pinned.description || `Xem video ngắn ${pinned.title} trên Terence`,
      openGraph: { title: pinned.title, images: pinned.thumbnailUrl ? [{ url: pinned.thumbnailUrl }] : [] },
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

  let feed: ShortItem[] = []
  let cursor: string | null = null
  let library: LibraryStatus | null = null
  const pinnedPromise = loadPinned(v, userId)

  if (tab === 'discover') {
    // The client shows its error state (with retry) if the library is down.
    const page = await listLibrary({ sort: 'trending', limit: PAGE }).catch(() => null)
    if (page) {
      feed = page.items.map(libraryToItem)
      cursor = page.nextCursor
      library = page.status
    }
  } else {
    const rows: ShortDto[] = await getFeed({ tab, seed, limit: PAGE, userId })
    feed = rows
    cursor = rows.length === PAGE ? String(PAGE) : null
  }

  const pinned = await pinnedPromise
  const initial = pinned ? [pinned, ...feed.filter((s) => s.id !== pinned.id)] : feed

  return <ShortsFeed initial={initial} initialTab={tab} seed={seed} initialCursor={cursor} initialLibrary={library} />
}
