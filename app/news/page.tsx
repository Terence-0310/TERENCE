import type { Metadata } from 'next'
import {
  getTopEntertainmentNews,
  getNewsByCategory,
} from '@/src/be/modules/news/news.service'
import { NewsHero } from '@/src/fe/components/news/NewsHero'
import { NewsArticleGrid, NewsFeatured } from '@/src/fe/components/news/NewsArticleCard'
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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 flex items-end gap-4">
      <div className="h-8 w-1 rounded-full bg-primary" />
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-white/40">{subtitle}</p>}
      </div>
    </div>
  )
}

export default async function NewsPage() {
  // Fetched together so the hero only links to sections that have content.
  const [top, trailers, reviews] = await Promise.all([
    getTopEntertainmentNews({ limit: 13 }).catch(() => []),
    getNewsByCategory('trailer').catch(() => []),
    getNewsByCategory('review').catch(() => []),
  ])

  const categories = [
    { id: 'trailer', title: 'Trailer mới', subtitle: 'Teaser, trailer chính thức và preview phim sắp ra mắt.', items: trailers.slice(0, 6) },
    { id: 'review', title: 'Review & đánh giá', subtitle: 'Bài viết phân tích, chấm điểm phim mới.', items: reviews.slice(0, 6) },
  ].filter((c) => c.items.length > 0)

  const sections = [
    ...(top.length > 0 ? [{ href: '#noi-bat', label: 'Tin nổi bật' }] : []),
    ...categories.map((c) => ({ href: `#${c.id}`, label: c.title })),
  ]

  return (
    <main className="min-h-screen bg-background">
      <NewsHero sections={sections} />

      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-10 space-y-16">
        <section id="noi-bat" className="scroll-mt-24">
          <SectionHeader title="Tin nổi bật" subtitle="Top headlines giải trí hôm nay." />
          {top.length > 0 ? <NewsFeatured articles={top} /> : <NewsEmptyState type="empty" />}
        </section>

        {categories.map((c) => (
          <section key={c.id} id={c.id} className="scroll-mt-24">
            <SectionHeader title={c.title} subtitle={c.subtitle} />
            <NewsArticleGrid articles={c.items} compact />
          </section>
        ))}
      </div>
    </main>
  )
}
