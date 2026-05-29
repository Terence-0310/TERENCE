'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type ReviewItem = {
  id: string
  rating: number
  content: string | null
  isSpoiler: boolean
  likeCount: number
  createdAt: string
  user: { id: string; name: string; avatar: string | null }
  movie: { id: string; title: string; slug: string; posterUrl: string | null }
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

type Sort = 'recent' | 'popular' | 'rating'

const SORT_OPTIONS: { value: Sort; label: string; hint: string }[] = [
  { value: 'recent', label: 'Mới nhất', hint: 'Đánh giá mới gửi' },
  { value: 'popular', label: 'Lượt thích cao', hint: 'Được cộng đồng thả tim nhiều' },
  { value: 'rating', label: 'Điểm cao nhất', hint: 'Sao đánh giá cao trước' },
]

const RATING_FILTERS = [0, 5, 4, 3, 2, 1]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function Stars({ rating }: { rating: number }) {
  // text-based — không icon
  const full = Math.round(rating)
  return (
    <span className="text-primary font-bold text-sm tabular-nums" aria-label={`${rating}/5 sao`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < full ? 'text-primary' : 'text-white/15'}>
          ★
        </span>
      ))}
      <span className="ml-1.5 text-xs text-white/60 font-medium">{rating.toFixed(1)}</span>
    </span>
  )
}

export default function ReviewsPage() {
  const [sort, setSort] = useState<Sort>('recent')
  const [minRating, setMinRating] = useState<number>(0)
  const [items, setItems] = useState<ReviewItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

  const fetchPage = useCallback(
    async (page: number, append: boolean) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)

      try {
        const qs = new URLSearchParams({
          page: String(page),
          limit: '12',
          sort,
          rating: String(minRating),
        })
        const res = await fetch(`/api/v1/reviews?${qs.toString()}`)
        const body = await res.json()
        if (!res.ok || !body?.success) {
          throw new Error(body?.error || `HTTP ${res.status}`)
        }
        const data = body.data as ReviewItem[]
        setPagination(body.pagination as Pagination)
        setItems((prev) => (append ? [...prev, ...data] : data))
      } catch (err: any) {
        setError(err?.message || 'Không tải được đánh giá')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [sort, minRating]
  )

  // Reset & load page 1 mỗi khi đổi filter
  useEffect(() => {
    fetchPage(1, false)
  }, [fetchPage])

  const handleLike = async (id: string) => {
    if (likedIds.has(id)) return
    // optimistic
    setItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, likeCount: r.likeCount + 1 } : r))
    )
    setLikedIds((prev) => new Set(prev).add(id))
    try {
      await fetch(`/api/v1/reviews/${id}/like`, { method: 'POST' })
    } catch {
      // revert nếu lỗi
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, likeCount: r.likeCount - 1 } : r))
      )
      setLikedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const totalLabel = useMemo(() => {
    if (!pagination) return ''
    return `${pagination.total.toLocaleString('vi-VN')} đánh giá đã duyệt`
  }, [pagination])

  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8 pt-[88px]">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Hero */}
        <section className="rounded-2xl border border-white/10 bg-card/40 p-6 md:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">
            Cộng đồng TERENCE
          </p>
          <h1 className="text-white text-3xl md:text-4xl font-extrabold tracking-tight">
            Đánh giá phim
          </h1>
          <p className="mt-2 text-sm text-white/50 max-w-2xl">
            Những bài đánh giá đã được duyệt từ thành viên. Bạn có thể lọc theo điểm sao, sắp xếp
            theo mức độ phổ biến và thả tim cho review hay.
          </p>
          {pagination && (
            <p className="mt-3 text-xs text-white/40 tabular-nums">{totalLabel}</p>
          )}
        </section>

        {/* Filter bar */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 mr-1">
              Sắp xếp
            </span>
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSort(s.value)}
                title={s.hint}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  sort === s.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 mr-1">
              Điểm tối thiểu
            </span>
            {RATING_FILTERS.map((r) => (
              <button
                key={r}
                onClick={() => setMinRating(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  minRating === r
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 border border-transparent'
                }`}
              >
                {r === 0 ? 'Tất cả' : `${r}+ ★`}
              </button>
            ))}
          </div>
        </section>

        {/* List */}
        {loading ? (
          <ReviewSkeleton />
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-6 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center px-4 py-10">
            <p className="text-white/60 text-sm font-medium">Chưa có đánh giá nào phù hợp.</p>
            <p className="mt-1 text-xs text-white/40">
              Hãy giảm điểm tối thiểu hoặc xem mục Mới nhất.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                liked={likedIds.has(r.id)}
                onLike={() => handleLike(r.id)}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {pagination?.hasNext && !loading && (
          <div className="flex justify-center">
            <button
              onClick={() => fetchPage(pagination.page + 1, true)}
              disabled={loadingMore}
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition disabled:opacity-50"
            >
              {loadingMore
                ? 'Đang tải…'
                : `Xem thêm (${pagination.total - items.length} đánh giá)`}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

// ════════════════════════════════════════════════
// Review card
// ════════════════════════════════════════════════
function ReviewCard({
  review,
  liked,
  onLike,
}: {
  review: ReviewItem
  liked: boolean
  onLike: () => void
}) {
  const [showSpoiler, setShowSpoiler] = useState(false)
  const hideContent = review.isSpoiler && !showSpoiler

  return (
    <article className="flex flex-col rounded-2xl border border-white/[0.06] bg-card/40 p-5 transition hover:border-white/15">
      {/* Header: movie poster + title + rating */}
      <div className="flex gap-3">
        <Link
          href={`/movie/${review.movie.slug}`}
          className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-lg border border-white/[0.06] bg-white/5"
        >
          {review.movie.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={review.movie.posterUrl}
              alt={review.movie.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-white/30">
              Không poster
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={`/movie/${review.movie.slug}`}
            className="text-sm font-bold text-white hover:text-primary transition line-clamp-2"
          >
            {review.movie.title}
          </Link>
          <div className="mt-1.5">
            <Stars rating={review.rating} />
          </div>
          <p className="mt-1 text-[11px] text-white/40">{fmtDate(review.createdAt)}</p>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 min-h-[3rem] text-sm leading-relaxed text-white/80">
        {hideContent ? (
          <button
            onClick={() => setShowSpoiler(true)}
            className="w-full rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-3 text-xs font-semibold text-amber-300 hover:bg-amber-500/10 transition"
          >
            Cảnh báo tiết lộ nội dung — Bấm để hiện
          </button>
        ) : (
          <p className="whitespace-pre-line line-clamp-6">{review.content || '(Không có nội dung)'}</p>
        )}
      </div>

      {/* Footer: user + like */}
      <div className="mt-4 pt-4 flex items-center justify-between border-t border-white/[0.04]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
            {review.user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={review.user.avatar}
                alt={review.user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              review.user.name.charAt(0).toUpperCase()
            )}
          </div>
          <span className="text-xs font-semibold text-white/80 truncate">{review.user.name}</span>
        </div>

        <button
          onClick={onLike}
          disabled={liked}
          className={`rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums transition ${
            liked
              ? 'bg-primary/15 text-primary cursor-default'
              : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          {liked ? 'Đã thích · ' : 'Thả tim · '}
          {review.likeCount}
        </button>
      </div>
    </article>
  )
}

function ReviewSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-64 rounded-2xl skeleton" />
      ))}
    </div>
  )
}
