'use client'

// TikTok / Reels-style vertical feed.
//   • Snap scrolling, one short per screen; only the visible one plays.
//   • Tap = pause/play, double-tap = like, swipe / ↑↓ / J K = next/prev,
//     Space = pause, M = mute.
//   • Infinite scroll with a per-session seed (stable "Dành cho bạn" order).
//   • URL follows the active short (/shorts?v=<id>) so it can be shared.
//   • "Khám phá" streams an external library (Coverr, or mock clips without a
//     key). Those videos have no TERENCE likes / comments / views — only share
//     and the provider's attribution are shown.
//   • Search covers TERENCE shorts, or the library when on "Khám phá".

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
  Heart, MessageCircle, Share2, Volume2, VolumeX, Play, ChevronUp, ChevronDown, Loader2, Film, Eye, Clapperboard,
  Search, X, AlertTriangle, RotateCw, ExternalLink,
} from 'lucide-react'
import { authModalStore } from '@/src/fe/components/auth/auth-modal-store'
import { ShortPlayer } from './ShortPlayer'
import { ShortComments } from './ShortComments'
import {
  formatCount, libraryToItem, LIBRARY_TOPICS, type FeedTab, type LibraryStatus, type LibraryVideo, type ShortItem,
} from './types'

const PAGE = 10
const VIEW_AFTER_MS = 3000
const TABS: { id: FeedTab; label: string }[] = [
  { id: 'foryou', label: 'Dành cho bạn' },
  { id: 'latest', label: 'Mới nhất' },
  { id: 'popular', label: 'Phổ biến' },
  { id: 'discover', label: 'Khám phá' },
]
const MUTE_KEY = 'terence:shorts:muted'

/** What the feed is currently showing. */
interface FeedSource {
  tab: FeedTab
  query: string
  topic: string | null
}

interface FetchResult {
  items: ShortItem[]
  next: string | null
  library?: LibraryStatus
}

interface Props {
  initial: ShortItem[]
  initialTab: FeedTab
  seed: string
  /** Cursor for the page after `initial` (null = nothing more). */
  initialCursor: string | null
  initialLibrary?: LibraryStatus | null
}

export function ShortsFeed({ initial, initialTab, seed, initialCursor, initialLibrary = null }: Props) {
  const { status } = useSession()
  const [source, setSource] = useState<FeedSource>({ tab: initialTab, query: '', topic: null })
  const tab = source.tab
  const [items, setItems] = useState<ShortItem[]>(initial)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [done, setDone] = useState(initialCursor === null)
  const [library, setLibrary] = useState<LibraryStatus | null>(initialLibrary)
  const [searchOpen, setSearchOpen] = useState(false)
  const [commentsFor, setCommentsFor] = useState<string | null>(null)
  const [burst, setBurst] = useState<{ id: string; key: number } | null>(null)

  const scrollerRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<string | null>(initialCursor)
  // Bumped on every source change so responses for an old source are dropped.
  const requestRef = useRef(0)
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
    if (current) {
      window.history.replaceState(null, '', `/shorts?v=${encodeURIComponent(current.id)}${tab !== 'foryou' ? `&tab=${tab}` : ''}`)
    }
  }, [current, tab])

  // Count a view once the short has been on screen for a few seconds.
  // Library videos have no TERENCE counters.
  useEffect(() => {
    if (!current || current.external || viewedRef.current.has(current.id)) return
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

  const fetchPage = useCallback(async (src: FeedSource, cursor: string | null): Promise<FetchResult> => {
    if (!src.query && src.tab !== 'discover') {
      const skip = Number(cursor ?? 0)
      const res = await fetch(`/api/v1/shorts?tab=${src.tab}&seed=${seed}&skip=${skip}&limit=${PAGE}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const list: ShortItem[] = (await res.json())?.data ?? []
      return { items: list, next: list.length === PAGE ? String(skip + PAGE) : null }
    }

    const params = new URLSearchParams({ limit: String(PAGE) })
    if (cursor) params.set('cursor', cursor)
    if (src.topic) params.set('topic', src.topic)
    let url = `/api/v1/shorts/trending?${params}`
    if (src.query) {
      params.set('q', src.query)
      params.set('scope', src.tab === 'discover' ? 'library' : 'terence')
      url = `/api/v1/shorts/search?${params}`
    }
    const res = await fetch(url)
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.success) throw new Error(json?.error || `HTTP ${res.status}`)
    const data = json.data as { scope: 'terence' | 'library'; items: unknown[]; nextCursor: string | null; library?: LibraryStatus }
    return {
      items: data.scope === 'library' ? (data.items as LibraryVideo[]).map(libraryToItem) : (data.items as ShortItem[]),
      next: data.nextCursor,
      library: data.library,
    }
  }, [seed])

  const loadMore = useCallback(async () => {
    if (loading || done || error) return
    const req = requestRef.current
    setLoading(true)
    try {
      const page = await fetchPage(source, cursorRef.current)
      if (req !== requestRef.current) return
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id))
        return [...prev, ...page.items.filter((m) => !seen.has(m.id))]
      })
      cursorRef.current = page.next
      if (page.library) setLibrary(page.library)
      if (!page.next) setDone(true)
    } catch {
      // Keep what is already on screen and stop paging.
      if (req === requestRef.current) setDone(true)
    } finally {
      if (req === requestRef.current) setLoading(false)
    }
  }, [loading, done, error, fetchPage, source])

  useEffect(() => {
    if (active >= items.length - 3) loadMore()
  }, [active, items.length, loadMore])

  /** Replace the feed with the first page of another source (tab / search / topic). */
  const reload = useCallback(async (src: FeedSource) => {
    const req = ++requestRef.current
    setSource(src)
    setCommentsFor(null)
    setItems([])
    setActive(0)
    setError(false)
    setDone(false)
    setLoading(true)
    scrollerRef.current?.scrollTo({ top: 0 })
    try {
      const page = await fetchPage(src, null)
      if (req !== requestRef.current) return
      setItems(page.items)
      cursorRef.current = page.next
      setDone(!page.next)
      setLibrary(page.library ?? null)
    } catch {
      if (req === requestRef.current) setError(true)
    } finally {
      if (req === requestRef.current) setLoading(false)
    }
  }, [fetchPage])

  const switchTab = (t: FeedTab) => {
    if (t === tab && !source.query) return
    reload({ tab: t, query: '', topic: null })
  }

  const runSearch = (q: string) => {
    const query = q.trim()
    setSearchOpen(false)
    if (!query || query === source.query) return
    // A search replaces the topic filter (and vice versa) — combining them
    // would just AND two keywords together upstream.
    reload({ ...source, query, topic: null })
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
    if (item.external) return
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
    const url = `${window.location.origin}/shorts?v=${encodeURIComponent(item.id)}${item.external ? '&tab=discover' : ''}`
    try {
      if (navigator.share) await navigator.share({ title: item.title, url })
      else {
        await navigator.clipboard.writeText(url)
        toast.success('Đã sao chép liên kết', { icon: null })
      }
    } catch {
      return // user cancelled the share sheet
    }
    if (item.external) return
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
    // Library videos can't be liked: every tap just toggles playback.
    if (item.external) {
      setPaused((p) => !p)
      return
    }
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

  const clearSearch = () => reload({ ...source, query: '' })
  const pickTopic = (id: string) => reload({ ...source, query: '', topic: source.topic === id ? null : id })
  // Search chip / topic chips sit under the tabs on mobile.
  const filterRow = !!source.query || tab === 'discover'
  const searchPlaceholder = tab === 'discover' ? 'Tìm trong thư viện video…' : 'Tìm theo phim, hashtag…'

  // ── Render ────────────────────────────────────────────────────
  return (
    // Pinned under the fixed 4rem header so the feed is exactly one viewport tall.
    <main className="fixed inset-x-0 bottom-0 top-16 overflow-hidden bg-black">
      {/* Tabs — text tabs over the video on mobile, vertical list on desktop */}
      <nav className="absolute left-12 right-2 top-3 z-30 flex items-center gap-3.5 overflow-x-auto whitespace-nowrap scrollbar-hide md:left-8 md:right-auto md:top-8 md:w-56 md:flex-col md:items-stretch md:gap-1.5 md:overflow-visible md:whitespace-normal">
        <span className="mb-3 ml-3 hidden self-start rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary md:block">
          Shorts
        </span>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchTab(t.id)}
            className={`relative shrink-0 pb-1.5 text-[14px] font-bold drop-shadow transition md:rounded-xl md:px-4 md:py-2.5 md:pb-2.5 md:text-left md:text-sm md:drop-shadow-none ${
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

        <SearchForm
          key={`d-${tab}-${source.query}`}
          className="mt-4 hidden md:flex"
          initial={source.query}
          placeholder={searchPlaceholder}
          onSubmit={runSearch}
        />
        {source.query && (
          <SearchChip query={source.query} onClear={clearSearch} className="mt-2 hidden self-start md:inline-flex" />
        )}
        {tab === 'discover' && (
          <div className="mt-3 hidden flex-wrap gap-1.5 md:flex">
            {LIBRARY_TOPICS.map((t) => (
              <TopicChip key={t.id} label={t.label} active={source.topic === t.id} onClick={() => pickTopic(t.id)} />
            ))}
          </div>
        )}
        {tab === 'discover' && library && <LibraryNote status={library} className="mt-4 hidden md:block" />}
      </nav>

      {/* Mobile search */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-label="Tìm kiếm video"
        className="absolute left-2 top-1.5 z-30 flex h-9 w-9 items-center justify-center rounded-full text-white drop-shadow transition hover:bg-white/10 md:hidden"
      >
        <Search className="h-5 w-5" />
      </button>
      {searchOpen && (
        <div className="absolute inset-x-0 top-0 z-40 bg-black/90 p-3 backdrop-blur-md md:hidden">
          <SearchForm
            initial={source.query}
            placeholder={searchPlaceholder}
            onSubmit={runSearch}
            onCancel={() => setSearchOpen(false)}
            autoFocus
          />
        </div>
      )}
      {filterRow && (
        <div className="absolute inset-x-0 top-12 z-30 flex gap-2 overflow-x-auto px-3 pb-1 scrollbar-hide md:hidden">
          {source.query && <SearchChip query={source.query} onClear={clearSearch} />}
          {tab === 'discover' && LIBRARY_TOPICS.map((t) => (
            <TopicChip key={t.id} label={t.label} active={source.topic === t.id} onClick={() => pickTopic(t.id)} />
          ))}
        </div>
      )}

      {items.length === 0 ? (
        loading ? (
          <FeedSkeleton />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center text-white/60">
            {error ? (
              <>
                <AlertTriangle className="mb-4 h-12 w-12 text-amber-400/70" />
                <p className="text-sm">Không tải được video</p>
                <p className="mt-1 text-xs text-white/35">
                  {tab === 'discover' ? 'Thư viện video tạm thời không khả dụng.' : 'Kiểm tra kết nối mạng rồi thử lại.'}
                </p>
                <button
                  type="button"
                  onClick={() => reload(source)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  <RotateCw className="h-3.5 w-3.5" /> Thử lại
                </button>
              </>
            ) : source.query ? (
              <>
                <Search className="mb-4 h-12 w-12 text-white/15" />
                <p className="text-sm">Không tìm thấy video cho “{source.query}”</p>
                <p className="mt-1 text-xs text-white/35">
                  Thử từ khoá khác{tab !== 'discover' ? ' hoặc tìm trong tab Khám phá' : ''}.
                </p>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  Xoá tìm kiếm
                </button>
              </>
            ) : (
              <>
                <Clapperboard className="mb-4 h-12 w-12 text-white/15" />
                {tab === 'discover' ? (
                  <p className="text-sm">Chưa có video cho chủ đề này</p>
                ) : (
                  <>
                    <p className="text-sm">Chưa có video ngắn nào</p>
                    <p className="mt-1 text-xs text-white/35">Quản trị viên có thể nhập Shorts trong Dashboard → Shorts</p>
                  </>
                )}
              </>
            )}
          </div>
        )
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
                    className={`absolute right-3 z-20 flex ${filterRow ? 'top-[6.5rem]' : 'top-14'} items-center gap-1.5 rounded-full bg-black/45 px-3 py-2 text-xs font-medium text-white backdrop-blur-md transition hover:bg-black/60 md:top-4`}
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
                    {item.external ? (
                      <ExternalCredit item={item} />
                    ) : (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-white/50">
                        <Eye className="h-3 w-3" /> {formatCount(item.viewCount)} lượt xem
                      </div>
                    )}
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
  if (item.external) {
    // No TERENCE likes / comments for library videos — and no fake counts.
    return (
      <div className={`flex-col items-center gap-4 ${className}`}>
        <button type="button" onClick={onShare} className={btn} aria-label="Chia sẻ">
          <Share2 className="h-6 w-6 text-white" />
        </button>
      </div>
    )
  }
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

function SearchForm({ initial, placeholder, onSubmit, onCancel, autoFocus, className = '' }: {
  initial: string
  placeholder: string
  onSubmit: (q: string) => void
  onCancel?: () => void
  autoFocus?: boolean
  className?: string
}) {
  const [value, setValue] = useState(initial)
  return (
    <form
      role="search"
      className={`flex items-center gap-2 ${className}`}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(value)
      }}
    >
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/10 focus-within:ring-primary/60">
        <Search className="h-4 w-4 shrink-0 text-white/50" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onCancel?.()}
          placeholder={placeholder}
          maxLength={100}
          autoFocus={autoFocus}
          enterKeyHint="search"
          aria-label="Từ khoá tìm kiếm"
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
      </label>
      {onCancel && (
        <button type="button" onClick={onCancel} className="shrink-0 px-1 text-sm font-semibold text-white/70 hover:text-white">
          Huỷ
        </button>
      )}
    </form>
  )
}

function SearchChip({ query, onClear, className = '' }: { query: string; onClear: () => void; className?: string }) {
  return (
    <span className={`inline-flex max-w-[16rem] shrink-0 items-center gap-1.5 rounded-full bg-primary/20 py-1 pl-3 pr-1 text-xs font-semibold text-primary ring-1 ring-primary/30 ${className}`}>
      <Search className="h-3 w-3 shrink-0" />
      <span className="truncate">{query}</span>
      <button type="button" onClick={onClear} aria-label="Xoá tìm kiếm" className="rounded-full p-0.5 hover:bg-primary/20">
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  )
}

function TopicChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md transition ${
        active ? 'bg-primary text-teal-950' : 'bg-black/40 text-white/80 ring-1 ring-white/15 hover:bg-white/15 md:bg-white/5'
      }`}
    >
      {label}
    </button>
  )
}

function LibraryNote({ status, className = '' }: { status: LibraryStatus; className?: string }) {
  let text: string | null = null
  if (status.provider === 'mock') {
    text = status.mode === 'fallback'
      ? 'Coverr tạm thời không khả dụng — đang hiện video mẫu.'
      : 'Video mẫu từ Wikimedia Commons. Thêm COVERR_API_KEY để dùng thư viện Coverr.'
  } else if (status.mode === 'stale') {
    text = 'Đang hiện dữ liệu đã lưu — Coverr tạm thời không phản hồi.'
  }
  if (!text) return null
  return <p className={`rounded-xl bg-white/5 px-3 py-2 text-[11px] leading-relaxed text-white/45 ${className}`}>{text}</p>
}

function ExternalCredit({ item }: { item: ShortItem }) {
  const ext = item.external!
  const link = 'pointer-events-auto inline-flex items-center gap-1 hover:text-white'
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/55">
      {ext.license.attribution && (
        ext.license.attributionUrl ? (
          <a href={ext.license.attributionUrl} target="_blank" rel="noopener noreferrer" className={`${link} font-semibold text-white/85`}>
            {ext.license.attribution}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="font-semibold text-white/85">{ext.license.attribution}</span>
        )
      )}
      {ext.author && <span>· {ext.author.name}</span>}
      {ext.license.url ? (
        <a href={ext.license.url} target="_blank" rel="noopener noreferrer" className={link}>· {ext.license.name}</a>
      ) : (
        <span>· {ext.license.name}</span>
      )}
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="flex h-full w-full items-end justify-center md:gap-5 md:py-5" aria-busy="true" aria-label="Đang tải video">
      <div className="relative h-full w-full animate-pulse overflow-hidden bg-white/[0.04] md:aspect-[9/16] md:w-auto md:rounded-2xl md:ring-1 md:ring-white/10">
        <div className="absolute inset-x-4 bottom-8 space-y-2.5">
          <div className="h-4 w-2/3 rounded bg-white/10" />
          <div className="h-3 w-1/2 rounded bg-white/10" />
          <div className="h-3 w-1/3 rounded bg-white/10" />
        </div>
        <Loader2 className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-spin text-primary/60" />
      </div>
      <div className="mb-6 hidden flex-col gap-4 md:flex">
        {[0, 1, 2].map((i) => <div key={i} className="h-12 w-12 animate-pulse rounded-full bg-white/10" />)}
      </div>
    </div>
  )
}
