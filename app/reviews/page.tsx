'use client'

import Image from 'next/image'
import Link from 'next/link'
import { getReviews, type ReviewItem } from '@/lib/data/reviews'

function ReviewCard({ item }: { item: ReviewItem }) {
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
      </div>

      <div className="p-5">
        <div className="text-xs text-white/60 mb-2">{item.date}</div>
        <h3 className="text-white font-bold leading-snug line-clamp-2">[Review Phim] {item.title}</h3>
        <p className="mt-2 text-sm text-white/60 leading-relaxed line-clamp-3">{item.excerpt}</p>
      </div>
    </Wrapper>
  )
}

export default function ReviewsPage() {
  const reviews = getReviews()

  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
      <h1 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight mb-6">Review phim</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {reviews.map((n) => (
          <ReviewCard key={n.id} item={n} />
        ))}
      </div>
    </main>
  )
}
