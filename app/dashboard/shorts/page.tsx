'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Clapperboard, Plus, RefreshCw, Loader2, Search, Eye, EyeOff, Trash2, Heart, MessageCircle, ExternalLink, X, Youtube, Film,
} from 'lucide-react'

interface AdminShort {
  id: string
  title: string
  description: string | null
  hashtags: string[]
  source: string
  videoType: string
  videoUrl: string
  thumbnailUrl: string | null
  orientation: string
  viewCount: number
  likeCount: number
  commentCount: number
  status: string
  createdAt: string
  movie: { id: string; slug: string; title: string } | null
}

interface ListData {
  items: AdminShort[]
  total: number
  page: number
  limit: number
  stats: { byStatus: Record<string, number>; totalViews: number; totalLikes: number }
  providers: { tmdb: boolean; youtube: boolean }
}

const SOURCE_LABEL: Record<string, string> = { tmdb: 'TMDB', youtube: 'YouTube', catalog: 'Trailer kho', admin: 'Thủ công' }
const STATUS_LABEL: Record<string, string> = { published: 'Hiển thị', hidden: 'Đã ẩn', draft: 'Nháp' }

const card = 'rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#151e2f] shadow-sm'
const input = 'h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-[#25396f] dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-none'

export default function ShortsAdminPage() {
  const [data, setData] = useState<ListData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [syncing, setSyncing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '20', ...(search && { search }), ...(status && { status }), ...(source && { source }) })
      const res = await fetch(`/api/admin/shorts?${qs}`)
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error)
      setData(json.data)
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'Không tải được danh sách Shorts')
    } finally {
      setLoading(false)
    }
  }, [page, search, status, source])

  useEffect(() => { void load() }, [load])

  const sync = async (src: 'tmdb' | 'youtube' | 'catalog' | 'all') => {
    setSyncing(src)
    try {
      const res = await fetch('/api/admin/shorts/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: src, limit: 50, perMovie: 2 }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error)
      const r = json.data
      toast.success(`Đã quét ${r.moviesScanned} phim · thêm ${r.created} video${r.skipped ? ` · bỏ qua ${r.skipped} trùng` : ''}`)
      setPage(1)
      void load()
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'Đồng bộ thất bại')
    } finally {
      setSyncing(null)
    }
  }

  const verify = async () => {
    setSyncing('verify')
    try {
      const res = await fetch('/api/admin/shorts/verify', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error)
      toast.success(`Đã kiểm tra ${json.data.checked} video · ẩn ${json.data.hidden} video không nhúng được`)
      void load()
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'Kiểm tra thất bại')
    } finally {
      setSyncing(null)
    }
  }

  const setItemStatus = async (s: AdminShort, next: 'published' | 'hidden') => {
    setBusy(s.id)
    try {
      const res = await fetch(`/api/admin/shorts/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error()
      setData((d) => d && { ...d, items: d.items.map((i) => (i.id === s.id ? { ...i, status: next } : i)) })
      toast.success(next === 'published' ? 'Đã hiển thị video' : 'Đã ẩn video')
    } catch {
      toast.error('Thao tác thất bại')
    } finally {
      setBusy(null)
    }
  }

  const remove = async (s: AdminShort) => {
    if (!confirm(`Xoá video "${s.title}"? Lượt thích và bình luận cũng bị xoá.`)) return
    setBusy(s.id)
    try {
      const res = await fetch(`/api/admin/shorts/${s.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Đã xoá video')
      void load()
    } catch {
      toast.error('Xoá thất bại')
    } finally {
      setBusy(null)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1
  const totalShorts = data ? Object.values(data.stats.byStatus).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="space-y-6 font-nunito pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 flex items-center gap-2 text-[28px] font-black text-[#25396f] dark:text-white">
            <Clapperboard className="h-6 w-6 text-primary" />
            Shorts
          </h1>
          <p className="font-medium text-gray-500 dark:text-gray-400">
            Video ngắn dạng TikTok/Reels tại <Link href="/shorts" target="_blank" className="text-primary hover:underline">/shorts</Link>.
            Nhập tự động từ TMDB, YouTube hoặc thêm thủ công.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Thêm video
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Tổng video', value: totalShorts },
          { label: 'Đang hiển thị', value: data?.stats.byStatus.published ?? 0 },
          { label: 'Lượt xem', value: data?.stats.totalViews ?? 0 },
          { label: 'Lượt thích', value: data?.stats.totalLikes ?? 0 },
        ].map((s) => (
          <div key={s.label} className={`${card} p-5`}>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className="mt-1 text-2xl font-black text-[#25396f] dark:text-white">{s.value.toLocaleString('vi-VN')}</p>
          </div>
        ))}
      </div>

      {/* Import */}
      <div className={`${card} p-5`}>
        <h2 className="mb-1 font-bold text-[#25396f] dark:text-white">Nhập tự động từ API</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Quét các phim đã publish chưa có Shorts từ nguồn tương ứng (tối đa 50 phim mỗi lần, 2 video/phim). Video trùng hoặc bị chủ kênh chặn nhúng tự bỏ qua.
        </p>
        <div className="flex flex-wrap gap-3">
          <SyncButton label="TMDB — clip, teaser, trailer" icon={Film} enabled={!!data?.providers.tmdb} disabledHint="Thiếu TMDB_READ_ACCESS_TOKEN" busy={syncing === 'tmdb'} onClick={() => sync('tmdb')} />
          <SyncButton label="YouTube — #shorts dọc" icon={Youtube} enabled={!!data?.providers.youtube} disabledHint="Thêm YOUTUBE_API_KEY vào .env" busy={syncing === 'youtube'} onClick={() => sync('youtube')} />
          <SyncButton label="Trailer có sẵn trong kho" icon={Clapperboard} enabled busy={syncing === 'catalog'} onClick={() => sync('catalog')} />
          <SyncButton label="Kiểm tra video hỏng (ẩn video bị chặn nhúng)" icon={EyeOff} enabled busy={syncing === 'verify'} onClick={verify} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form
          className="relative min-w-[220px] flex-1"
          onSubmit={(e) => { e.preventDefault(); setPage(1); void load() }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tiêu đề hoặc tên phim…" className={`${input} pl-9`} />
        </form>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className={`${input} w-auto`}>
          <option value="">Mọi trạng thái</option>
          <option value="published">Hiển thị</option>
          <option value="hidden">Đã ẩn</option>
          <option value="draft">Nháp</option>
        </select>
        <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1) }} className={`${input} w-auto`}>
          <option value="">Mọi nguồn</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* List */}
      {loading && !data ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-20 text-center dark:border-white/10">
          <Clapperboard className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-white/15" />
          <p className="text-gray-500 dark:text-white/50">Chưa có video nào. Hãy nhập từ API hoặc thêm thủ công.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {data.items.map((s) => (
            <div key={s.id} className={`${card} overflow-hidden ${s.status !== 'published' ? 'opacity-60' : ''}`}>
              <a href={`/shorts?v=${s.id}`} target="_blank" rel="noreferrer" className="group relative block aspect-[9/12] bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.thumbnailUrl || '/placeholder.jpg'} alt={s.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase text-white">{SOURCE_LABEL[s.source] ?? s.source}</span>
                <span className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">{STATUS_LABEL[s.status] ?? s.status}</span>
                <div className="absolute inset-x-0 bottom-0 flex gap-3 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 text-[11px] font-semibold text-white">
                  <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{s.viewCount}</span>
                  <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{s.likeCount}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{s.commentCount}</span>
                </div>
              </a>
              <div className="space-y-2 p-3">
                <p className="line-clamp-2 text-sm font-bold text-[#25396f] dark:text-white">{s.title}</p>
                {s.movie && <p className="truncate text-xs font-semibold text-primary">{s.movie.title}</p>}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={busy === s.id}
                    onClick={() => setItemStatus(s, s.status === 'published' ? 'hidden' : 'published')}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
                  >
                    {s.status === 'published' ? <><EyeOff className="h-3.5 w-3.5" /> Ẩn</> : <><Eye className="h-3.5 w-3.5" /> Hiện</>}
                  </button>
                  <a
                    href={s.videoType === 'youtube' ? `https://www.youtube.com/watch?v=${s.videoUrl}` : s.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-2 py-1.5 text-gray-500 transition hover:bg-gray-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
                    aria-label="Mở video gốc"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    disabled={busy === s.id}
                    onClick={() => remove(s)}
                    className="inline-flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-red-500 transition hover:bg-red-500/20 disabled:opacity-50"
                    aria-label="Xoá"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold disabled:opacity-40 dark:border-white/10 dark:text-white">Trước</button>
          <span className="text-sm text-gray-500 dark:text-white/60">Trang {page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold disabled:opacity-40 dark:border-white/10 dark:text-white">Sau</button>
        </div>
      )}

      {showForm && <CreateShortModal onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); setPage(1); void load() }} />}
    </div>
  )
}

function SyncButton({ label, icon: Icon, enabled, disabledHint, busy, onClick }: {
  label: string
  icon: typeof Film
  enabled: boolean
  disabledHint?: string
  busy: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled || busy}
      title={!enabled ? disabledHint : undefined}
      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-[#25396f] transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:text-white"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
      {!enabled && disabledHint && <span className="text-[11px] font-medium text-gray-400">({disabledHint})</span>}
      {enabled && !busy && <RefreshCw className="h-3.5 w-3.5 opacity-50" />}
    </button>
  )
}

interface MovieOption { id: string; title: string; year: number | null }

function CreateShortModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: '', description: '', hashtags: '', videoType: 'youtube' as 'youtube' | 'mp4' | 'hls',
    videoUrl: '', thumbnailUrl: '', orientation: 'portrait' as 'portrait' | 'landscape', status: 'published' as 'published' | 'draft',
  })
  const [movie, setMovie] = useState<MovieOption | null>(null)
  const [movieQuery, setMovieQuery] = useState('')
  const [movieResults, setMovieResults] = useState<MovieOption[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (movieQuery.trim().length < 2) { setMovieResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/admin/movies?search=${encodeURIComponent(movieQuery)}&limit=6`)
      const json = await res.json().catch(() => null)
      setMovieResults((json?.data ?? []).map((m: MovieOption) => ({ id: m.id, title: m.title, year: m.year })))
    }, 300)
    return () => clearTimeout(t)
  }, [movieQuery])

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          movieId: movie?.id ?? null,
          description: form.description || null,
          hashtags: form.hashtags || null,
          thumbnailUrl: form.thumbnailUrl || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error)
      toast.success('Đã thêm video')
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : 'Không thêm được video')
    } finally {
      setSaving(false)
    }
  }

  const label = 'mb-1 block text-xs font-bold text-gray-500 dark:text-gray-400'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog">
      <form onSubmit={submit} className={`${card} max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto p-6`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-[#25396f] dark:text-white">Thêm video Shorts</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['youtube', 'mp4', 'hls'] as const).map((t) => (
            <button key={t} type="button" onClick={() => set('videoType', t)}
              className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${form.videoType === t ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 dark:border-white/10 dark:text-white/60'}`}>
              {t === 'youtube' ? 'YouTube' : t.toUpperCase()}
            </button>
          ))}
        </div>

        <div>
          <label className={label}>{form.videoType === 'youtube' ? 'Link YouTube (watch / shorts / youtu.be)' : 'URL video'}</label>
          <input required value={form.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} className={input}
            placeholder={form.videoType === 'youtube' ? 'https://youtube.com/shorts/…' : form.videoType === 'hls' ? 'https://…/index.m3u8' : 'https://…/video.mp4'} />
        </div>
        <div>
          <label className={label}>Tiêu đề</label>
          <input required maxLength={200} value={form.title} onChange={(e) => set('title', e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Mô tả</label>
          <textarea maxLength={2000} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} className={`${input} h-auto py-2`} />
        </div>
        <div>
          <label className={label}>Hashtag (cách nhau bởi dấu cách)</label>
          <input value={form.hashtags} onChange={(e) => set('hashtags', e.target.value)} className={input} placeholder="#hanhdong #phimhay" />
        </div>

        <div className="relative">
          <label className={label}>Phim liên kết (tuỳ chọn)</label>
          {movie ? (
            <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
              {movie.title}{movie.year ? ` (${movie.year})` : ''}
              <button type="button" onClick={() => setMovie(null)}><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <>
              <input value={movieQuery} onChange={(e) => setMovieQuery(e.target.value)} className={input} placeholder="Gõ tên phim để tìm…" />
              {movieResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#1b2538]">
                  {movieResults.map((m) => (
                    <button key={m.id} type="button" onClick={() => { setMovie(m); setMovieQuery(''); setMovieResults([]) }}
                      className="block w-full px-3 py-2 text-left text-sm text-[#25396f] hover:bg-gray-50 dark:text-white dark:hover:bg-white/5">
                      {m.title}{m.year ? ` (${m.year})` : ''}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Khung hình</label>
            <select value={form.orientation} onChange={(e) => set('orientation', e.target.value as 'portrait' | 'landscape')} className={input}>
              <option value="portrait">Dọc 9:16</option>
              <option value="landscape">Ngang 16:9</option>
            </select>
          </div>
          <div>
            <label className={label}>Trạng thái</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value as 'published' | 'draft')} className={input}>
              <option value="published">Hiển thị ngay</option>
              <option value="draft">Lưu nháp</option>
            </select>
          </div>
        </div>
        {form.videoType !== 'youtube' && (
          <div>
            <label className={label}>Ảnh bìa (URL)</label>
            <input value={form.thumbnailUrl} onChange={(e) => set('thumbnailUrl', e.target.value)} className={input} placeholder="https://…/thumb.jpg" />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 dark:border-white/10 dark:text-white/70">Huỷ</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Thêm video
          </button>
        </div>
      </form>
    </div>
  )
}
