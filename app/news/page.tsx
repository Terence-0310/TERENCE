'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Newspaper } from 'lucide-react'
import { getNews, type NewsItem } from '@/lib/data/news'

function NewsCard({ item }: { item: NewsItem }) {
  const Wrapper = item.href ? Link : ('div' as any)
  const wrapperProps = item.href ? { href: item.href } : {}

  return (
    <Wrapper
      {...wrapperProps}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card/40 hover:bg-card/60 transition"
    >
      <div className="relative aspect-16/10">
        <Image src={item.image} alt={item.title} fill className="object-cover group-hover:scale-[1.02] transition-transform duration-300" sizes="(max-width: 1024px) 100vw, 50vw" />
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-transparent" />
        {item.category && (
          <span className="absolute top-3 left-3 rounded-full bg-primary/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            {item.category === 'box-office' ? 'Box Office' : item.category === 'review' ? 'Review' : item.category === 'industry' ? 'Tin tức' : 'Casting'}
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="text-xs text-white/60 mb-2">{item.date}</div>
        <h3 className="text-white font-bold leading-snug line-clamp-2">{item.title}</h3>
        <p className="mt-2 text-sm text-white/60 leading-relaxed line-clamp-3">{item.excerpt}</p>
      </div>
    </Wrapper>
  )
}

export default function NewsPage() {
  const news = getNews()

  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Tin tức phim</h1>
          <p className="text-muted-foreground text-sm">Cập nhật tin tức mới nhất từ thế giới điện ảnh</p>
        </div>

        {news.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {news.map((n) => (
              <NewsCard key={n.id} item={n} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <Newspaper className="h-12 w-12 text-white/10 mb-4" />
            <p className="text-white/50 text-sm">Chưa có tin tức</p>
          </div>
        )}
      </div>
    </main>
  )
}
