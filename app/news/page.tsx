'use client'

// ============================================
// News Page — /news (complete rewrite)
// ============================================
// Full news page with hero, search, tabs, article grids,
// and upcoming movies section.
// Uses useNewsPage hook for all state management.

import { useNewsPage } from '@/hooks/useNewsPage'
import { NewsHero } from '@/components/news/NewsHero'
import { NewsTabs } from '@/components/news/NewsTabs'
import { NewsSearchBar } from '@/components/news/NewsSearchBar'
import { NewsArticleCard, NewsArticleGrid } from '@/components/news/NewsArticleCard'
import { UpcomingMovieGrid } from '@/components/news/UpcomingMovieCard'
import { ArticleGridSkeleton, UpcomingGridSkeleton } from '@/components/news/NewsSkeletons'
import { NewsEmptyState } from '@/components/news/NewsEmptyState'
import { RefreshCw, Calendar, Flame, Play, Star, Search } from 'lucide-react'

export default function NewsPage() {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults,
    searchLoading,
    clearSearch,
    breakingNews,
    breakingLoading,
    trailerNews,
    trailerLoading,
    reviewNews,
    reviewLoading,
    upcomingMovies,
    upcomingLoading,
    refresh,
  } = useNewsPage()

  // Use first upcoming movie backdrop for hero
  const featuredBackdrop = upcomingMovies[0]?.backdrop

  return (
    <main className="min-h-screen bg-background">
      {/* ─── Hero Banner ─── */}
      <NewsHero featuredBackdrop={featuredBackdrop} />

      {/* ─── Main Content ─── */}
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8">

        {/* ─── Search + Tabs Bar ─── */}
        <div className="space-y-5 mb-8">
          <NewsSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={clearSearch}
            loading={searchLoading}
          />

          {!isSearching && (
            <div className="flex items-center justify-between gap-4">
              <NewsTabs activeTab={activeTab} onTabChange={setActiveTab} />
              <button
                onClick={refresh}
                className="hidden md:inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/[0.06] px-3 py-2 text-[11px] text-white/40 hover:bg-white/10 hover:text-white/60 transition shrink-0"
                title="Làm mới dữ liệu"
              >
                <RefreshCw className="h-3 w-3" />
                Làm mới
              </button>
            </div>
          )}
        </div>

        {/* ─── Search Results (takes priority over tabs) ─── */}
        {isSearching ? (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <Search className="h-4.5 w-4.5 text-primary" />
              <h2 className="text-lg font-bold text-white">
                Kết quả cho &ldquo;{searchQuery.trim()}&rdquo;
              </h2>
              <button
                onClick={clearSearch}
                className="ml-auto text-xs text-white/30 hover:text-white/60 transition"
              >
                ✕ Xóa tìm kiếm
              </button>
            </div>

            {searchLoading ? (
              <ArticleGridSkeleton count={4} compact />
            ) : searchResults.length > 0 ? (
              <NewsArticleGrid articles={searchResults} compact />
            ) : (
              <NewsEmptyState type="search" query={searchQuery.trim()} />
            )}
          </section>
        ) : (
          /* ─── Tab Content ─── */
          <div className="space-y-12">
            {/* === TAB: Tin nóng === */}
            {activeTab === 'breaking' && (
              <section>
                <SectionHeader
                  icon={<Flame className="h-5 w-5 text-orange-400" />}
                  title="Tin nóng điện ảnh"
                />
                {breakingLoading ? (
                  <ArticleGridSkeleton count={6} />
                ) : breakingNews.length > 0 ? (
                  <NewsArticleGrid articles={breakingNews} />
                ) : (
                  <NewsEmptyState type="empty" />
                )}
              </section>
            )}

            {/* === TAB: Sắp ra rạp === */}
            {activeTab === 'upcoming' && (
              <section>
                <SectionHeader
                  icon={<Calendar className="h-5 w-5 text-primary" />}
                  title="Phim sắp ra rạp"
                />
                {upcomingLoading ? (
                  <UpcomingGridSkeleton count={10} />
                ) : upcomingMovies.length > 0 ? (
                  <UpcomingMovieGrid movies={upcomingMovies.slice(0, 15)} />
                ) : (
                  <NewsEmptyState type="empty" message="Chưa có thông tin phim sắp chiếu." />
                )}
              </section>
            )}

            {/* === TAB: Trailer === */}
            {activeTab === 'trailer' && (
              <section>
                <SectionHeader
                  icon={<Play className="h-5 w-5 text-emerald-400" />}
                  title="Trailer mới nhất"
                />
                {trailerLoading ? (
                  <ArticleGridSkeleton count={6} compact />
                ) : trailerNews.length > 0 ? (
                  <NewsArticleGrid articles={trailerNews} compact />
                ) : (
                  <NewsEmptyState type="empty" message="Chưa có tin trailer mới. Thử quay lại sau." />
                )}
              </section>
            )}

            {/* === TAB: Review === */}
            {activeTab === 'review' && (
              <section>
                <SectionHeader
                  icon={<Star className="h-5 w-5 text-yellow-400" />}
                  title="Review & Đánh giá"
                />
                {reviewLoading ? (
                  <ArticleGridSkeleton count={6} compact />
                ) : reviewNews.length > 0 ? (
                  <NewsArticleGrid articles={reviewNews} compact />
                ) : (
                  <NewsEmptyState type="empty" message="Chưa có bài review mới. Thử quay lại sau." />
                )}
              </section>
            )}

            {/* ─── Featured Upcoming (always visible on non-upcoming tabs) ─── */}
            {activeTab !== 'upcoming' && upcomingMovies.length > 0 && (
              <section className="border-t border-white/[0.04] pt-10">
                <div className="flex items-center justify-between mb-5">
                  <SectionHeader
                    icon={<Calendar className="h-5 w-5 text-primary" />}
                    title="Sắp ra rạp"
                  />
                  <button
                    onClick={() => setActiveTab('upcoming')}
                    className="text-xs font-medium text-primary/60 hover:text-primary transition"
                  >
                    Xem tất cả →
                  </button>
                </div>
                {upcomingLoading ? (
                  <UpcomingGridSkeleton count={5} />
                ) : (
                  <UpcomingMovieGrid movies={upcomingMovies.slice(0, 5)} />
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

// ── Shared Section Header ──

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
      {icon}
      {title}
    </h2>
  )
}
