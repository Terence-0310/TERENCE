import { HeroBanner } from '@/src/fe/components/home/HeroBanner'
import { ContinueWatchingRow } from '@/src/fe/components/home/ContinueWatchingRow'
import { RecommendedRow } from '@/src/fe/components/home/RecommendedRow'
import { InterestsSection } from '@/src/fe/components/home/InterestsSection'
import { MovieRow } from '@/src/fe/components/shared/MovieRow'
import { TopCommentsCarousel } from '@/src/fe/components/home/TopCommentsCarousel'
import { TrendingRankings } from '@/src/fe/components/home/TrendingRankings'
import { MovieNewsSection, MovieNewsSkeleton } from '@/src/fe/components/news/MovieNewsSection'
import { UpcomingMoviesSection } from '@/src/fe/components/news/UpcomingMoviesSection'
import { getTrending, getPopular, getTopRated, getNowPlaying, getUpcoming, getMoviesByCountry } from '@/src/be/services/tmdb/movie-service'
import { Film } from 'lucide-react'
import { Suspense } from 'react'

// Don't try to statically prerender the home page at build time. It depends
// on TMDB + OPhim availability, both of which are flaky from CI / Docker
// build hosts (60s timeouts on ophim1.com would fail the whole image build).
// Rendering on demand also means fresh content per visit — fine for a home
// page with a movie-row layout.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HomePage() {
  // Use allSettled so ONE failed call doesn't crash the entire page
  const [
    trendingR, popularR, topRatedR, nowPlayingR, upcomingR,
    krR, cnR, usR
  ] = await Promise.allSettled([
    getTrending(),
    getPopular(),
    getTopRated(),
    getNowPlaying(),
    getUpcoming(),
    getMoviesByCountry('KR'),
    getMoviesByCountry('CN'),
    getMoviesByCountry('US'),
  ])

  const emptyPage = { items: [], page: 1, totalPages: 0, totalResults: 0 }
  const trending = trendingR.status === 'fulfilled' ? trendingR.value : emptyPage
  const popular = popularR.status === 'fulfilled' ? popularR.value : emptyPage
  const topRated = topRatedR.status === 'fulfilled' ? topRatedR.value : emptyPage
  const nowPlaying = nowPlayingR.status === 'fulfilled' ? nowPlayingR.value : emptyPage
  const upcoming = upcomingR.status === 'fulfilled' ? upcomingR.value : emptyPage
  const krMovies = krR.status === 'fulfilled' ? krR.value : emptyPage
  const cnMovies = cnR.status === 'fulfilled' ? cnR.value : emptyPage
  const usMovies = usR.status === 'fulfilled' ? usR.value : emptyPage

  // Only show welcome screen if ALL calls failed (no data at all)
  const hasAnyData = trending.items.length > 0 || popular.items.length > 0 ||
    topRated.items.length > 0 || nowPlaying.items.length > 0 || upcoming.items.length > 0

  if (!hasAnyData) {
    return (
      <main className="min-h-screen bg-background">
        <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <Film className="h-10 w-10 text-primary" />
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
      {/* 1. Hero Banner — dùng popular (backdrop rộng hơn trending) */}
      <HeroBanner movies={
        popular.items
          .filter(m => m.backdropUrl && m.backdropUrl !== '/placeholder.jpg')
          .slice(0, 6)
          .length >= 2
          ? popular.items
              .filter(m => m.backdropUrl && m.backdropUrl !== '/placeholder.jpg')
              .slice(0, 6)
          : trending.items
              .filter(m => m.backdropUrl && m.backdropUrl !== '/placeholder.jpg')
              .slice(0, 6)
      } />

      {/* Content Sections */}
      <div className="-mt-8 relative z-10 space-y-8 pb-16">
        {/* 2. Continue Watching — client component, auto-hides when empty */}
        <ContinueWatchingRow />

        {/* 2.5. Recommended For You — AI Based on watch history */}
        <div className="animate-row-in" style={{ '--row': 0 } as React.CSSProperties}>
          <RecommendedRow />
        </div>

        {/* 3. "Bạn đang quan tâm gì?" — RoPhim-style interest category cards */}
        <div className="animate-row-in" style={{ '--row': 0 } as React.CSSProperties}>
          <InterestsSection />
        </div>

        {/* 4. Movie Rows — RoPhim-style landscape grid with title on left */}
        <div className="animate-row-in" style={{ '--row': 1 } as React.CSSProperties}>
          <MovieRow
            title="Phim phổ biến"
            accent="phổ biến"
            movies={popular.items}
            href="/browse?category=popular"
          />
        </div>

        <div className="animate-row-in" style={{ '--row': 2 } as React.CSSProperties}>
          <MovieRow
            title="Xu hướng tuần này"
            accent="tuần này"
            movies={trending.items}
            href="/browse?category=trending"
            showRank
          />
        </div>

        <div className="animate-row-in" style={{ '--row': 3 } as React.CSSProperties}>
          <MovieRow
            title="Rổ Phim Đề Cử"
            accent="Đề Cử"
            movies={topRated.items}
            href="/browse?category=top-rated"
            landscape={false}
          />
        </div>

        <div className="animate-row-in" style={{ '--row': 4 } as React.CSSProperties}>
          <MovieRow
            title="Đang chiếu rạp"
            accent="chiếu rạp"
            movies={nowPlaying.items}
            href="/browse?category=now-playing"
          />
        </div>

        {/* Phim Hàn Quốc */}
        <div className="animate-row-in" style={{ '--row': 5 } as React.CSSProperties}>
          <MovieRow
            title="Phim Hàn Quốc tập mới"
            accent="Hàn Quốc"
            movies={krMovies.items}
            href="/browse?country=KR"
          />
        </div>

        {/* Phim Trung Quốc */}
        <div className="animate-row-in" style={{ '--row': 6 } as React.CSSProperties}>
          <MovieRow
            title="Phim Trung Quốc tập mới"
            accent="Trung Quốc"
            movies={cnMovies.items}
            href="/browse?country=CN"
          />
        </div>

        {/* Phim US-UK */}
        <div className="animate-row-in" style={{ '--row': 7 } as React.CSSProperties}>
          <MovieRow
            title="Phim US-UK tập mới"
            accent="US-UK"
            movies={usMovies.items}
            href="/browse?country=US"
          />
        </div>

        <div className="animate-row-in" style={{ '--row': 8 } as React.CSSProperties}>
          <MovieRow
            title="Sắp ra mắt"
            accent="ra mắt"
            movies={upcoming.items}
            href="/browse?category=upcoming"
          />
        </div>

        {/* 5. Top Bình Luận Carousel — community section */}
        <div className="animate-row-in" style={{ '--row': 9 } as React.CSSProperties}>
          <TopCommentsCarousel />
        </div>

        {/* 6. Trending Rankings — Sôi nổi / Yêu thích / Bình luận mới (Match style rophim1) */}
        <div className="animate-row-in" style={{ '--row': 10 } as React.CSSProperties}>
          <TrendingRankings />
        </div>

        {/* 7. Movie News Feed (Server Component with Suspense to avoid blocking) */}
        <div className="animate-row-in" style={{ '--row': 11 } as React.CSSProperties}>
          <Suspense fallback={<MovieNewsSkeleton />}>
            <MovieNewsSection />
          </Suspense>
        </div>

        {/* 8. Upcoming Movies feed */}
        <div className="animate-row-in" style={{ '--row': 12 } as React.CSSProperties}>
          <UpcomingMoviesSection />
        </div>
      </div>


    </main>
  )
}
