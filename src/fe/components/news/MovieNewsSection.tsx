import { getTopEntertainmentNews } from '@/src/be/modules/news/news.service'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { NewsCard } from './NewsCard'

export async function MovieNewsSection() {
  const items = await getTopEntertainmentNews({ limit: 10 })

  if (items.length === 0) return null

  if (items.length === 0) return null

  return (
    <section className="group/row relative">
      {/* Match MovieRow outer wrapper so left edge aligns with "Đang chiếu rạp" etc. */}
      <div className="bg-[var(--surface-elevated)] rounded-none md:rounded-2xl mx-0 md:mx-5 lg:mx-8 py-8 px-5 md:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            Tin tức điện ảnh
          </h2>
          <Link
            href="/news"
            className="text-xs font-medium text-primary/70 hover:text-primary transition flex items-center gap-1"
          >
            Xem tất cả
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Horizontal scroll — bleed to outer padding edges */}
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5 md:-mx-8 md:px-8 snap-x snap-mandatory">
          {items.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </section>
  )
}

export function MovieNewsSkeleton() {
  return (
    <section className="group/row relative">
      <div className="bg-[var(--surface-elevated)] rounded-none md:rounded-2xl mx-0 md:mx-5 lg:mx-8 py-8 px-5 md:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            Tin tức điện ảnh
          </h2>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-72 flex-shrink-0 rounded-2xl border border-white/[0.06] bg-card/30 overflow-hidden">
              <div className="aspect-[16/10] skeleton" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-16 rounded skeleton" />
                <div className="h-4 w-full rounded skeleton" />
                <div className="h-3 w-2/3 rounded skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
