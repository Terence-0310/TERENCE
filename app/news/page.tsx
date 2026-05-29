import { Suspense } from 'react'
import type { Metadata } from 'next'
import {
  getTopEntertainmentNews,
  getNewsByCategory,
} from '@/src/be/modules/news/news.service'
import { NewsHero } from '@/src/fe/components/news/NewsHero'
import { NewsArticleGrid } from '@/src/fe/components/news/NewsArticleCard'
import { NewsEmptyState } from '@/src/fe/components/news/NewsEmptyState'
import { ArticleGridSkeleton } from '@/src/fe/components/news/NewsSkeletons'

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

async function TopNewsSection() {
  const items = await getTopEntertainmentNews({ limit: 12 }).catch(() => [])
  if (items.length === 0) {
    return <NewsEmptyState type="empty" />
  }
  return <NewsArticleGrid articles={items} />
}

async function CategorySection({ category }: { category: 'trailer' | 'review' }) {
  const items = await getNewsByCategory(category).catch(() => [])
  if (items.length === 0) {
    return (
      <NewsEmptyState
        type="empty"
        message={
          category === 'trailer'
            ? 'Chưa có trailer mới. Quay lại sau nhé.'
            : 'Chưa có bài review mới. Quay lại sau nhé.'
        }
      />
    )
  }
  return <NewsArticleGrid articles={items.slice(0, 6)} compact />
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-white/40">{subtitle}</p>}
    </div>
  )
}

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-background">
      <NewsHero />

      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-10 space-y-14">
        <section>
          <SectionHeader
            title="Tin nổi bật"
            subtitle="Top headlines giải trí — cập nhật mỗi 20 phút."
          />
          <Suspense fallback={<ArticleGridSkeleton count={6} />}>
            <TopNewsSection />
          </Suspense>
        </section>

        <section>
          <SectionHeader
            title="Trailer mới"
            subtitle="Teaser, trailer chính thức và preview phim sắp ra mắt."
          />
          <Suspense fallback={<ArticleGridSkeleton count={6} compact />}>
            <CategorySection category="trailer" />
          </Suspense>
        </section>

        <section>
          <SectionHeader
            title="Review & đánh giá"
            subtitle="Bài viết phân tích, chấm điểm phim mới."
          />
          <Suspense fallback={<ArticleGridSkeleton count={6} compact />}>
            <CategorySection category="review" />
          </Suspense>
        </section>
      </div>
    </main>
  )
}
