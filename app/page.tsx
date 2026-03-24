import { HeroBanner } from '@/components/home/HeroBanner'
import { MovieRow } from '@/components/shared/MovieRow'
import { GenreChips } from '@/components/shared/GenreChips'
import { getTrending, getPopular, getTopRated, getNowPlaying, getUpcoming, getGenres } from '@/services/tmdb/movie-service'

export default async function HomePage() {
  let trending, popular, topRated, nowPlaying, upcoming, genres

  try {
    ;[trending, popular, topRated, nowPlaying, upcoming, genres] = await Promise.all([
      getTrending(),
      getPopular(),
      getTopRated(),
      getNowPlaying(),
      getUpcoming(),
      getGenres(),
    ])
  } catch {
    return (
      <main className="min-h-screen bg-background">
        <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <span className="text-4xl">🎬</span>
          </div>
          <h1 className="mb-3 text-3xl font-bold text-white">Chào mừng đến Terence</h1>
          <p className="mb-6 max-w-md text-muted-foreground leading-relaxed">
            Cấu hình TMDB API key trong file <code className="rounded bg-card px-1.5 py-0.5 text-xs text-primary">.env</code> để
            bắt đầu khám phá hàng ngàn bộ phim.
          </p>
          <div className="rounded-xl bg-card border border-white/5 p-4 text-left text-sm">
            <code className="text-muted-foreground">
              <span className="text-primary">TMDB_API_KEY</span>=your_key<br />
              <span className="text-primary">TMDB_READ_ACCESS_TOKEN</span>=your_token
            </code>
          </div>
          <p className="mt-4 text-xs text-muted-foreground/60">
            Đăng ký miễn phí tại{' '}
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener" className="text-primary underline">
              themoviedb.org
            </a>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <HeroBanner movies={trending.items.slice(0, 6)} />

      {/* Content Sections */}
      <div className="-mt-8 relative z-10 space-y-10 pb-16">
        <div className="animate-row-in" style={{ '--row': 0 } as React.CSSProperties}>
          <MovieRow
            title="🔥 Xu hướng tuần này"
            movies={trending.items}
            href="/browse?category=trending"
            showRank
          />
        </div>

        <div className="animate-row-in" style={{ '--row': 1 } as React.CSSProperties}>
          <MovieRow
            title="🎬 Phim phổ biến"
            movies={popular.items}
            href="/browse?category=popular"
          />
        </div>

        <div className="animate-row-in" style={{ '--row': 2 } as React.CSSProperties}>
          <GenreChips genres={genres} />
        </div>

        <div className="animate-row-in" style={{ '--row': 3 } as React.CSSProperties}>
          <MovieRow
            title="⭐ Đánh giá cao nhất"
            movies={topRated.items}
            href="/browse?category=top-rated"
          />
        </div>

        <div className="animate-row-in" style={{ '--row': 4 } as React.CSSProperties}>
          <MovieRow
            title="🍿 Đang chiếu rạp"
            movies={nowPlaying.items}
            href="/browse?category=now-playing"
          />
        </div>

        <div className="animate-row-in" style={{ '--row': 5 } as React.CSSProperties}>
          <MovieRow
            title="📅 Sắp ra mắt"
            movies={upcoming.items}
            href="/browse?category=upcoming"
          />
        </div>
      </div>

      {/* TMDB Attribution */}
      <div className="border-t border-white/[0.04] px-5 py-6 text-center">
        <p className="text-[11px] text-muted-foreground/40">
          Dữ liệu phim cung cấp bởi{' '}
          <a href="https://www.themoviedb.org" target="_blank" rel="noopener" className="underline hover:text-muted-foreground/60">
            TMDB
          </a>
          . Terence không host hay phân phối nội dung bản quyền.
        </p>
      </div>
    </main>
  )
}
