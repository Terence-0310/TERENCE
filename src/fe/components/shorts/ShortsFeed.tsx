'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Play, Star, Info, Loader2, ChevronUp } from 'lucide-react'

export interface ShortItem {
  id: string
  slug: string
  title: string
  posterUrl: string | null
  backdropUrl: string | null
  year: number | null
  rating: number | null
  contentType: string
  isShort: boolean
  description: string | null
  genres: string[]
  trailerKey: string | null
  trailerSite: string | null
}

const PAGE = 20

export function ShortsFeed({ initial }: { initial: ShortItem[] }) {
  const [items, setItems] = useState<ShortItem[]>(initial)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(initial.length < PAGE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(async () => {
    if (loading || done) return
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/shorts?limit=${PAGE}&skip=${items.length}`)
      const json = await res.json()
      const more: ShortItem[] = json?.data || []
      // De-dupe (the fill query can repeat between pages).
      const seen = new Set(items.map((i) => i.id))
      const fresh = more.filter((m) => !seen.has(m.id))
      if (fresh.length === 0) setDone(true)
      else setItems((prev) => [...prev, ...fresh])
      if (more.length < PAGE) setDone(true)
    } catch {
      setDone(true)
    } finally {
      setLoading(false)
    }
  }, [items, loading, done])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && loadMore(),
      { rootMargin: '600px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [loadMore])

  if (items.length === 0) {
    return (
      <main className="flex min-h-[80vh] flex-col items-center justify-center text-center text-white/60">
        <Play className="mb-4 h-12 w-12 text-white/15" />
        <p className="text-sm">Chưa có nội dung Shorts</p>
      </main>
    )
  }

  return (
    <main className="h-[100dvh] w-full snap-y snap-mandatory overflow-y-scroll bg-black scrollbar-hide">
      {items.map((item, i) => (
        <ShortCard key={item.id} item={item} index={i} />
      ))}
      <div ref={sentinelRef} className="h-px w-full" />
      {loading && (
        <div className="flex h-16 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
    </main>
  )
}

function ShortCard({ item, index }: { item: ShortItem; index: number }) {
  const img = item.backdropUrl || item.posterUrl || '/placeholder.jpg'
  const isYouTube =
    !!item.trailerKey && (item.trailerSite?.toLowerCase().includes('youtube') ?? true)

  return (
    <section className="relative flex h-[100dvh] w-full snap-start snap-always items-end justify-center overflow-hidden">
      {/* Background — trailer when available, else artwork */}
      {isYouTube ? (
        <iframe
          className="pointer-events-none absolute left-1/2 top-1/2 aspect-video w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2"
          src={`https://www.youtube.com/embed/${item.trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${item.trailerKey}&modestbranding=1&playsinline=1`}
          title={item.title}
          allow="autoplay; encrypted-media"
        />
      ) : (
        <Image
          src={img}
          alt={item.title}
          fill
          priority={index < 2}
          sizes="100vw"
          className="object-cover"
        />
      )}

      {/* Gradients for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-4xl px-5 pb-24 md:px-10 md:pb-16">
        <div className="flex flex-wrap items-center gap-2">
          {item.isShort && (
            <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Short
            </span>
          )}
          {item.year && (
            <span className="rounded-md border border-white/15 px-2 py-0.5 text-[11px] text-white/80">
              {item.year}
            </span>
          )}
          {!!item.rating && item.rating > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400/15 px-2 py-0.5 text-[11px] font-semibold text-yellow-300">
              <Star className="h-3 w-3 fill-current" />
              {item.rating.toFixed(1)}
            </span>
          )}
          {item.genres.slice(0, 3).map((g) => (
            <span key={g} className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
              {g}
            </span>
          ))}
        </div>

        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white drop-shadow-lg md:text-4xl">
          {item.title}
        </h2>

        {item.description && (
          <p className="mt-2 line-clamp-3 max-w-2xl text-sm text-white/75 md:text-base">
            {item.description}
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <Link
            href={`/watch/${item.slug}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:brightness-110"
          >
            <Play className="h-4 w-4 fill-current" />
            Xem ngay
          </Link>
          <Link
            href={`/movie/${item.slug}`}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10"
          >
            <Info className="h-4 w-4" />
            Chi tiết
          </Link>
        </div>
      </div>

      {/* Swipe hint on the first card */}
      {index === 0 && (
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center text-white/40">
          <ChevronUp className="h-5 w-5 animate-bounce" />
          <span className="text-[10px]">Vuốt lên</span>
        </div>
      )}
    </section>
  )
}
