import type { Metadata } from 'next'
import {
  getTopEntertainmentNews,
  getNewsByCategory,
} from '@/src/be/modules/news/news.service'
import { NewsHero } from '@/src/fe/components/news/NewsHero'
import {
  NewsHeadlineList,
  NewsLead,
  NewsList,
  NewsTileRow,
} from '@/src/fe/components/news/NewsArticleCard'
import { NewsEmptyState } from '@/src/fe/components/news/NewsEmptyState'

export const metadata: Metadata = {
  title: 'Tin tức điện ảnh — TERENCE',
  description:
    'Tin tức phim mới, trailer, review và lịch chiếu rạp cập nhật hàng ngày tại TERENCE.',
}

// Force dynamic rendering so:
//   - A freshly-set GNEWS_API_KEY shows results immediately (no rebuild needed)
//   - New NewsPost rows from /dashboard/news/new appear instantly
//   - The AI generator's output surfaces right after the admin clicks "Sinh"
// The underlying service still caches the external API call in `systemSetting`
// for 20 minutes, so the runtime cost stays low.
export const dynamic = 'force-dynamic'
export const revalidate = 0

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-5 flex items-center gap-2.5 text-lg font-bold uppercase tracking-wide text-white">
      <span className="h-5 w-1 rounded-full bg-primary" />
      {children}
    </h2>
  )
}

export default async function NewsPage() {
  // Fetched together so the tab bar only links to sections that have content.
  // limit 10 = the homepage's key, so both pages share one cached GNews call.
  const [top, trailers, reviews] = await Promise.all([
    getTopEntertainmentNews({ limit: 10 }).catch(() => []),
    getNewsByCategory('trailer').catch(() => []),
    getNewsByCategory('review').catch(() => []),
  ])

  const [lead, ...others] = top
  const tiles = others.slice(0, 3)
  let latest = others.slice(3)

  let sidebar = [
    { id: 'trailer', title: 'Trailer mới', items: trailers.slice(0, 6) },
    { id: 'review', title: 'Review & đánh giá', items: reviews.slice(0, 6) },
  ].filter((g) => g.items.length > 0)
  // Few trailer/review results would leave the sidebar mostly empty: move the
  // tail of the feed there, keeping at least three stories in "Mới nhất".
  const sidebarCount = sidebar.reduce((n, g) => n + g.items.length, 0)
  const moved = Math.min(Math.max(0, 6 - sidebarCount), Math.max(0, latest.length - 3))
  if (moved > 0) {
    sidebar = [{ id: 'doc-them', title: 'Đọc thêm', items: latest.slice(-moved) }, ...sidebar]
    latest = latest.slice(0, -moved)
  }

  const sections = [
    ...(lead ? [{ href: '#noi-bat', label: 'Nổi bật' }] : []),
    ...(latest.length > 0 ? [{ href: '#moi-nhat', label: 'Mới nhất' }] : []),
    ...sidebar.map((g) => ({ href: `#${g.id}`, label: g.title })),
  ]

  return (
    <main className="min-h-screen bg-background">
      <NewsHero sections={sections} />

      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8">
        {!lead ? (
          <NewsEmptyState type="empty" />
        ) : (
          <div className={`grid grid-cols-1 gap-10 ${sidebar.length > 0 ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
            <div className="min-w-0 space-y-10">
              <section id="noi-bat" className="scroll-mt-24 space-y-8">
                <NewsLead article={lead} />
                {tiles.length > 0 && (
                  <div className="border-t border-white/[0.07] pt-8">
                    <NewsTileRow articles={tiles} />
                  </div>
                )}
              </section>

              {latest.length > 0 && (
                <section id="moi-nhat" className="scroll-mt-24 border-t border-white/[0.07] pt-8">
                  <SectionTitle>Mới nhất</SectionTitle>
                  <NewsList articles={latest} />
                </section>
              )}
            </div>

            {sidebar.length > 0 && (
              <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
                {sidebar.map((g) => (
                  <section
                    key={g.id}
                    id={g.id}
                    className="scroll-mt-24 rounded-xl border border-white/[0.07] bg-card/30 p-5"
                  >
                    <SectionTitle>{g.title}</SectionTitle>
                    <NewsHeadlineList articles={g.items} />
                  </section>
                ))}
              </aside>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
