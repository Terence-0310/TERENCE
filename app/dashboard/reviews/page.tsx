'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Check, X, Star, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface PendingReview {
  id: string
  rating: number
  content: string | null
  isSpoiler: boolean
  createdAt: string
  user: { id: string; name: string; avatar: string | null }
  movie: { id: string; title: string; slug: string | null }
}

export default function ReviewModerationPage() {
  const [items, setItems] = useState<PendingReview[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reviews?limit=50')
      const body = await res.json()
      setItems(Array.isArray(body?.data) ? body.data : [])
    } catch {
      toast.error('Không tải được danh sách chờ duyệt')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const moderate = async (id: string, action: 'approve' | 'reject') => {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error()
      setItems((prev) => prev.filter((r) => r.id !== id))
      toast.success(action === 'approve' ? 'Đã duyệt & hiển thị công khai' : 'Đã từ chối bình luận')
    } catch {
      toast.error('Thao tác thất bại')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6 font-nunito pb-10">
      <div>
        <h1 className="text-[28px] font-black text-[#25396f] dark:text-white mb-1 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Kiểm duyệt bình luận
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Duyệt các đánh giá đang chờ. Duyệt xong sẽ hiển thị công khai và thông báo tới người viết + người theo dõi phim.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 dark:border-white/10 py-20 text-center">
          <Check className="mx-auto mb-3 h-10 w-10 text-emerald-500/40" />
          <p className="text-gray-500 dark:text-white/50">Không có bình luận nào đang chờ duyệt.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-500 dark:text-white/50">{items.length} bình luận chờ duyệt</p>
          {items.map((r) => (
            <div key={r.id} className="rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#151e2f] p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-[#25396f] dark:text-white truncate">{r.user.name}</span>
                  <span className="text-xs text-gray-400">→</span>
                  <span className="text-sm font-semibold text-primary truncate">{r.movie.title}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-white/15'}`} />
                  ))}
                </div>
              </div>

              {r.isSpoiler && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-yellow-500/10 px-2 py-0.5 text-[11px] font-bold text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="h-3 w-3" /> Spoiler
                </span>
              )}

              <p className="mt-2 text-sm text-gray-700 dark:text-white/80 leading-relaxed whitespace-pre-wrap">{r.content}</p>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">{new Date(r.createdAt).toLocaleString('vi-VN')}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => moderate(r.id, 'reject')}
                    disabled={busy === r.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Từ chối
                  </button>
                  <button
                    onClick={() => moderate(r.id, 'approve')}
                    disabled={busy === r.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Duyệt
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
