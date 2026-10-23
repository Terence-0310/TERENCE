'use client'

// TikTok / Reels-style vertical feed.
//   • Snap scrolling, one short per screen; only the visible one plays.
//   • Tap = pause/play, double-tap = like, swipe / ↑↓ / J K = next/prev,
//     Space = pause, M = mute.
//   • Infinite scroll with a per-session seed (stable "Dành cho bạn" order).
//   • URL follows the active short (/shorts?v=<id>) so it can be shared.

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
  Heart, MessageCircle, Share2, Volume2, VolumeX, Play, ChevronUp, ChevronDown, Loader2, Film, Eye, Clapperboard,
} from 'lucide-react'
import { authModalStore } from '@/src/fe/components/auth/auth-modal-store'
import { ShortPlayer } from './ShortPlayer'
import { ShortComments } from './ShortComments'
import { formatCount, type FeedTab, type ShortItem } from './types'

const PAGE = 10
const VIEW_AFTER_MS = 3000
const TABS: { id: FeedTab; label: string }[] = [
  { id: 'foryou', label: 'Dành cho bạn' },
  { id: 'latest', label: 'Mới nhất' },
  { id: 'popular', label: 'Phổ biến' },
]
const MUTE_KEY = 'terence:shorts:muted'

interface Props {
  initial: ShortItem[]
  initialTab: FeedTab
  seed: string
  /** The deep-linked short (/shorts?v=…) was prepended to `initial`. */
  pinnedFirst: boolean
}

export function ShortsFeed({ initial, initialTab, seed, pinnedFirst }: Props) {
  const { status } = useSession()
  const [tab, setTab] = useState<FeedTab>(initialTab)
  const [items, setItems] = useState<ShortItem[]>(initial)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(initial.length - (pinnedFirst ? 1 : 0) < PAGE)
  const [commentsFor, setCommentsFor] = useState<string | null>(null)
  const [burst, setBurst] = useState<{ id: string; key: number } | null>(null)

  const scrollerRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(pinnedFirst ? 1 : 0)
  const viewedRef = useRef(new Set<string>())
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef = useRef(0)

  // Remember the sound preference (browsers still need one gesture to unmute).
  useEffect(() => {
    try { if (localStorage.getItem(MUTE_KEY) === '0') setMuted(false) } catch { /* storage blocked */ }
  }, [])
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      try { localStorage.setItem(MUTE_KEY, m ? '0' : '1') } catch { /* storage blocked */ }
      return !m
    })
  }, [])

  // ── Active slide tracking ─────────────────────────────────────
  useEffect(() => {
    const root = scrollerRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
        }
      },
      { root, threshold: 0.6 },
    )
    root.querySelectorAll('[data-index]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [items.length])

  const current = items[active]
  activeRef.current = active

  useEffect(() => {
    setPaused(false)
    setProgress(0)
    if (current) window.history.replaceState(null, '', `/shorts?v=${current.id}${tab !== 'foryou' ? `&tab=${tab}` : ''}`)
  }, [current, tab])

  // Count a view once the short has been on screen for a few seconds.
  useEffect(() => {
    if (!current || viewedRef.current.has(current.id)) return
    const id = current.id
    const t = setTimeout(() => {
      viewedRef.current.add(id)
      fetch(`/api/v1/shorts/${id}/view`, { method: 'POST' })
        .then((r) => r.json())
        .then((j) => {
          if (j?.data?.counted) patch(id, { viewCount: j.data.viewCount })
        })
        .catch(() => {})
    }, VIEW_AFTER_MS)
    return () => clearTimeout(t)
  }, [current])

  // Pause when the browser tab is hidden.
  useEffect(() => {
    const onVis = () => document.hidden && setPaused(true)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // ── Data ──────────────────────────────────────────────────────
  const patch = (id: string, data: Partial<ShortItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...data } : it)))

  const fetchPage = useCallback(async (t: FeedTab, skip: number): Promise<ShortItem[]> => {
    const res = await fetch(`/api/v1/shorts?tab=${t}&seed=${seed}&skip=${skip}&limit=${PAGE}`)
    const json = await res.json()
    return json?.data ?? []
  }, [seed])

  const loadMore = useCallback(async () => {
    if (loading || done) return
    setLoading(true)
    try {
      const more = await fetchPage(tab, items.length - offsetRef.current)
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id))
        return [...prev, ...more.filter((m) => !seen.has(m.id))]
      })
      if (more.length < PAGE) setDone(true)
    } catch {
      setDone(true)
    } finally {
      setLoading(false)
    }
  }, [loading, done, fetchPage, tab, items.length])

  useEffect(() => {
    if (active >= items.length - 3) loadMore()
  }, [active, items.length, loadMore])

  const switchTab = async (t: FeedTab) => {
    if (t === tab) return
    setTab(t)
    setLoading(true)
    try {
      const fresh = await fetchPage(t, 0)
      offsetRef.current = 0
      setItems(fresh)
      setDone(fresh.length < PAGE)
      setActive(0)
      scrollerRef.current?.scrollTo({ top: 0 })
    } finally {
      setLoading(false)
    }
  }

  // ── Navigation ────────────────────────────────────────────────
  const goTo = useCallback((i: number) => {
    const root = scrollerRef.current
    if (!root || i < 0 || i >= items.length) return
    root.querySelector<HTMLElement>(`[data-index="${i}"]`)?.scrollIntoView({ behavior: 'smooth' })
  }, [items.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (commentsFor || tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); goTo(active + 1) }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); goTo(active - 1) }
      else if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p) }
      else if (e.key === 'm') toggleMute()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, commentsFor, goTo, toggleMute])

  // ── Actions ───────────────────────────────────────────────────
  const like = useCallback(async (item: ShortItem, forceOn = false) => {
    if (status !== 'authenticated') {
      authModalStore.open('login')
      return
    }
    if (forceOn && item.likedByMe) return
    const next = !item.likedByMe
    patch(item.id, { likedByMe: next, likeCount: item.likeCount + (next ? 1 : -1) })
    try {
      const res = await fetch(`/api/v1/shorts/${item.id}/like`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error)
      patch(item.id, { likedByMe: json.data.liked, likeCount: json.data.likeCount })
    } catch {
      patch(item.id, { likedByMe: item.likedByMe, likeCount: item.likeCount })
      toast.error('Không thể thích video lúc này', { icon: null })
    }
  }, [status])

  const share = async (item: ShortItem) => {
    const url = `${window.location.origin}/shorts?v=${item.id}`
    try {
      if (navigator.share) await navigator.share({ title: item.title, url })
      else {
        await navigator.clipboard.writeText(url)
        toast.success('Đã sao chép liên kết', { icon: null })
      }
    } catch {
      return // user cancelled the share sheet
    }
    fetch(`/api/v1/shorts/${item.id}/share`, { method: 'POST' })
      .then((r) => r.json())
      .then((j) => j?.data?.counted && patch(item.id, { shareCount: j.data.shareCount }))
      .catch(() => {})
  }

  // Unplayable video (removed / embedding disabled) → move on automatically.
  const skipUnavailable = (i: number) => {
    setTimeout(() => {
      if (i === activeRef.current) goTo(i + 1)
    }, 1500)
  }

  // Single tap → pause; double tap → like with a heart burst.
  const onStageTap = (item: ShortItem) => {
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current)
      tapTimerRef.current = null
      setBurst({ id: item.id, key: Date.now() })
      like(item, true)
      return
    }
    tapTimerRef.current = setTimeout(() => {
      tapTimerRef.current = null
      setPaused((p) => !p)
    }, 250)
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    // Pinned under the fixed 4rem header so the feed is exactly one viewport tall.
    <main className="fixed inset-x-0 bottom-0 top-16 overflow-hidden bg-black">
      {/* Tabs — text tabs over the video on mobile, vertical list on desktop */}
      <nav className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-5 whitespace-nowrap md:left-8 md:top-8 md:translate-x-0 md:flex-col md:items-stretch md:gap-1.5">
        <span className="mb-3 ml-3 hidden self-start rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary md:block">
          Shorts
        </span>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchTab(t.id)}
            className={`relative pb-1.5 text-[15px] font-bold drop-shadow transition md:rounded-xl md:px-4 md:py-2.5 md:pb-2.5 md:text-left md:text-sm md:drop-shadow-none ${
              tab === t.id
                ? 'text-white md:bg-white/10'
                : 'text-white/60 hover:text-white md:hover:bg-white/5'
            }`}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-white md:hidden" />
            )}
          </button>
        ))}
      </nav>

      {items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-center text-white/60">
          {loading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : (
            <>
              <Clapperboard className="mb-4 h-12 w-12 text-white/15" />
              <p className="text-sm">Chưa có video ngắn nào</p>
              <p className="mt-1 text-xs text-white/35">Quản trị viên có thể nhập Shorts trong Dashboard → Shorts</p>
            </>
          )}
        </div>
      ) : (
        <div ref={scrollerRef} className="h-full snap-y snap-mandatory overflow-y-scroll scrollbar-hide">
          {items.map((item, i) => (
            <section
              key={item.id}
              data-index={i}
              className="relative flex h-full w-full snap-start snap-always items-center justify-center"
            >
              {/* Desktop ambience */}
              {item.thumbnailUrl && Math.abs(i - active) <= 1 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnailUrl} alt="" aria-hidden className="absolute inset-0 hidden h-full w-full object-cover opacity-25 blur-3xl md:block" />
              )}

              <div className="relative flex h-full w-full items-end justify-center md:w-auto md:gap-5 md:py-5">
                {/* 9:16 stage */}
                <div className="relative h-full w-full overflow-hidden bg-black md:aspect-[9/16] md:w-auto md:rounded-2xl md:shadow-2xl md:shadow-black/60 md:ring-1 md:ring-white/10">
                  {Math.abs(i - active) <= 1 && (
                    <ShortPlayer
                      item={item}
                      active={i === active}
                      paused={paused || !!commentsFor}
                      muted={muted}
                      onProgress={i === active ? setProgress : () => {}}
                      onUnavailable={() => skipUnavailable(i)}
                    />
                  )}

                  {/* Tap layer */}
                  <button
                    type="button"
                    aria-label={paused ? 'Phát' : 'Tạm dừng'}
                    className="absolute inset-0 z-10 cursor-pointer"
                    onClick={() => onStageTap(item)}
                  />

                  {i === active && paused && (
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                        <Play className="ml-1 h-9 w-9 fill-white text-white" />
                      </div>
                    </div>
                  )}

                  {burst?.id === item.id && (
                    <Heart
                      key={burst.key}
                      className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-28 w-28 -translate-x-1/2 -translate-y-1/2 fill-rose-500 text-rose-500 drop-shadow-2xl animate-[short-like_0.8s_ease-out_forwards]"
                    />
                  )}

                  {/* Mute toggle */}
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="absolute right-3 top-14 z-20 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-2 text-xs font-medium text-white backdrop-blur-md transition hover:bg-black/60 md:top-4"
                    aria-label={muted ? 'Bật tiếng' : 'Tắt tiếng'}
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    {muted && i === active && <span className="hidden sm:inline">Bật tiếng</span>}
                  </button>

                  {/* Info */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-4 pb-5 pt-24 pr-[4.5rem] md:pr-4">
                    {item.movie && (
                      <Link
                        href={`/movie/${item.movie.slug}`}
                        className="pointer-events-auto mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
                      >
                        <Film className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate">{item.movie.title}{item.movie.year ? ` (${item.movie.year})` : ''}</span>
                      </Link>
                    )}
                    <h2 className="line-clamp-2 text-[15px] font-bold leading-snug text-white drop-shadow md:text-base">{item.title}</h2>
                    {item.description && item.description !== item.title && (
                      <p className="mt-1 line-clamp-2 text-[13px] text-white/75">{item.description}</p>
                    )}
                    {item.hashtags.length > 0 && (
                      <p className="mt-1.5 line-clamp-1 text-[13px] font-semibold text-white/90">
                        {item.hashtags.slice(0, 5).map((h) => `#${h}`).join(' ')}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-white/50">
                      <Eye className="h-3 w-3" /> {formatCount(item.viewCount)} lượt xem
                    </div>
                    {item.movie && (
                      <Link
                        href={`/watch/${item.movie.slug}`}
                        className="pointer-events-auto mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-teal-950 shadow-lg shadow-primary/30 transition hover:brightness-110"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Xem phim đầy đủ
                      </Link>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="absolute inset-x-0 bottom-0 z-30 h-[3px] bg-white/15">
                    <div className="h-full bg-primary transition-[width] duration-200 ease-linear" style={{ width: `${i === active ? progress * 100 : 0}%` }} />
                  </div>

                  {/* Action rail — inside the stage on mobile */}
                  <ActionRail
                    className="absolute bottom-28 right-2 z-20 flex md:hidden"
                    item={item}
                    onLike={() => like(item)}
                    onComment={() => setCommentsFor(item.id)}
                    onShare={() => share(item)}
                  />
                </div>

                {/* Action rail — beside the stage on desktop */}
                <ActionRail
                  className="mb-6 hidden md:flex"
                  item={item}
                  onLike={() => like(item)}
                  onComment={() => setCommentsFor(item.id)}
                  onShare={() => share(item)}
                />
              </div>
            </section>
          ))}
          {loading && (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      )}

      {/* Desktop up/down */}
      {items.length > 1 && (
        <div className="absolute right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 md:flex">
          <button type="button" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Video trước"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 disabled:opacity-30">
            <ChevronUp className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => goTo(active + 1)} disabled={active >= items.length - 1} aria-label="Video tiếp"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 disabled:opacity-30">
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      )}

      {commentsFor && (
        <ShortComments
          key={commentsFor}
          shortId={commentsFor}
          total={items.find((i) => i.id === commentsFor)?.commentCount ?? 0}
          onClose={() => setCommentsFor(null)}
          onCountChange={(n) => patch(commentsFor, { commentCount: n })}
        />
      )}
    </main>
  )
}

function ActionRail({ item, className, onLike, onComment, onShare }: {
  item: ShortItem
  className: string
  onLike: () => void
  onComment: () => void
  onShare: () => void
}) {
  const btn = 'flex h-12 w-12 items-center justify-center rounded-full bg-black/35 backdrop-blur-md transition hover:bg-white/15 md:bg-white/10'
  return (
    <div className={`flex-col items-center gap-4 ${className}`}>
      {item.movie && (
        <Link href={`/movie/${item.movie.slug}`} className="mb-1 block" aria-label={`Trang phim ${item.movie.title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.movie.posterUrl || '/placeholder.jpg'}
            alt={item.movie.title}
            className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-lg"
          />
        </Link>
      )}
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={onLike} className={btn} aria-label={item.likedByMe ? 'Bỏ thích' : 'Thích'}>
          <Heart className={`h-6 w-6 transition ${item.likedByMe ? 'scale-110 fill-rose-500 text-rose-500' : 'text-white'}`} />
        </button>
        <span className="text-xs font-semibold text-white drop-shadow">{formatCount(item.likeCount)}</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={onComment} className={btn} aria-label="Bình luận">
          <MessageCircle className="h-6 w-6 text-white" />
        </button>
        <span className="text-xs font-semibold text-white drop-shadow">{formatCount(item.commentCount)}</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={onShare} className={btn} aria-label="Chia sẻ">
          <Share2 className="h-6 w-6 text-white" />
        </button>
        <span className="text-xs font-semibold text-white drop-shadow">{formatCount(item.shareCount)}</span>
      </div>
    </div>
  )
}
