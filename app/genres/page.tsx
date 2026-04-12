import Link from 'next/link'
import { tmdbFetch } from '@/src/be/modules/tmdb/legacy/client'
import { Film } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Thể loại phim — Terence',
  description: 'Khám phá phim theo thể loại.',
}

// Fallback genres if TMDB API fails
const FALLBACK_GENRES = [
  { id: 28, name: 'Hành Động' },
  { id: 12, name: 'Phiêu Lưu' },
  { id: 16, name: 'Hoạt Hình' },
  { id: 35, name: 'Hài' },
  { id: 80, name: 'Hình Sự' },
  { id: 99, name: 'Tài Liệu' },
  { id: 18, name: 'Chính Kịch' },
  { id: 10751, name: 'Gia Đình' },
  { id: 14, name: 'Giả Tưởng' },
  { id: 36, name: 'Lịch Sử' },
  { id: 27, name: 'Kinh Dị' },
  { id: 10402, name: 'Âm Nhạc' },
  { id: 9648, name: 'Bí Ẩn' },
  { id: 10749, name: 'Lãng Mạn' },
  { id: 878, name: 'Khoa Học Viễn Tưởng' },
  { id: 53, name: 'Giật Gân' },
  { id: 10752, name: 'Chiến Tranh' },
  { id: 37, name: 'Viễn Tây' },
  { id: 10770, name: 'Phim Truyền Hình' },
]



async function getGenres() {
  try {
    const data = await tmdbFetch<{ genres: Array<{ id: number; name: string }> }>('/genre/movie/list', {
      revalidate: 86400, // cache 24h
    })
    return data.genres
  } catch {
    return FALLBACK_GENRES
  }
}

export default async function GenresPage() {
  const genres = await getGenres()

  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 animate-slide-in-left">
          <h1 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Thể loại phim</h1>
          <p className="text-muted-foreground text-sm">Chọn thể loại yêu thích để khám phá</p>
        </div>

        {genres.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {genres.map((genre, i) => (
              <Link
                key={genre.id}
                href={`/browse?genre=${genre.id}`}
                className="group rounded-xl border border-white/[0.06] bg-card/40 px-4 py-4 transition hover:bg-card/60 hover:border-primary/20 animate-chip-in"
                style={{ '--i': i } as React.CSSProperties}
              >
                <span className="text-sm font-medium text-white/80 group-hover:text-white truncate">
                  {genre.name}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <Film className="h-12 w-12 text-white/10 mb-4" />
            <p className="text-white/50 text-sm">Không tải được thể loại</p>
          </div>
        )}
      </div>
    </main>
  )
}
