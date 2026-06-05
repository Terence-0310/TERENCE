'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { MovieCard } from '@/src/fe/components/shared/MovieCard'
import type { Movie } from '@/types/movie'

interface FavMovie {
  id: string
  slug: string
  title: string
  originalTitle: string | null
  year: number | null
  posterUrl: string | null
  thumbUrl: string | null
  rating: number | null
  contentType: string
  tmdbId: number | null
}

export default function FavoritesPage() {
  const [items, setItems] = useState<FavMovie[]>([])
  const [loading, setLoading] = useState(true)
  const [unauthed, setUnauthed] = useState(false)

  useEffect(() => {
    fetch('/api/v1/favorites')
      .then(async (r) => {
        if (r.status === 401) { setUnauthed(true); return null }
        return r.ok ? r.json() : null
      })
      .then((d) => { if (d?.success) setItems(d.data || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toCard = (m: FavMovie): Movie => ({
    id: (m.tmdbId || m.slug) as unknown as number,
    title: m.title,
    originalTitle: m.originalTitle || m.title,
    overview: '',
    posterUrl: m.posterUrl || m.thumbUrl || null,
    backdropUrl: m.thumbUrl || m.posterUrl || null,
    releaseDate: m.year ? `${m.year}-01-01` : '',
    year: m.year || 0,
    voteAverage: Math.round((m.rating || 0) * 10) / 10,
    voteCount: 0, popularity: 0, genreIds: [], genres: [],
    runtime: 0, runtimeFormatted: '',
    mediaType: m.contentType === 'series' ? 'tv' : 'movie',
    slug: m.slug,
    customUrl: `/watch/${m.slug}`,
  })

  return (
    <main className="min-h-screen bg-background pb-24 md:pb-12">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 lg:px-10">
        <div className="mb-6 flex items-center gap-2.5">
          <Heart className="h-6 w-6 fill-primary text-primary" />
          <h1 className="text-xl font-bold text-white md:text-2xl">Phim yêu thích</h1>
          {!loading && !unauthed && (
            <span className="rounded-lg bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground border border-white/5">
              {items.length} phim
            </span>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : unauthed ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <p className="text-white/70">Vui lòng đăng nhập để xem phim yêu thích.</p>
            <Link href="/login" className="mt-4 rounded-lg bg-primary/10 px-5 py-2 text-sm font-medium text-primary transition hover:bg-primary/20">Đăng nhập</Link>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <Heart className="mb-4 h-10 w-10 text-white/20" />
            <p className="text-white/70">Bạn chưa lưu phim nào.</p>
            <Link href="/browse" className="mt-4 rounded-lg bg-primary/10 px-5 py-2 text-sm font-medium text-primary transition hover:bg-primary/20">Khám phá phim</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((m) => (
              <MovieCard key={m.id} movie={toCard(m)} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
