'use client'

// Comment sheet for one short: bottom sheet on mobile, side panel on desktop.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { X, Send, Loader2, Trash2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { authModalStore } from '@/src/fe/components/auth/auth-modal-store'
import { formatCount } from './types'

interface Comment {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string | null; avatar: string | null }
}

interface Props {
  shortId: string
  total: number
  onClose: () => void
  onCountChange: (count: number) => void
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'Vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ`
  if (s < 2592000) return `${Math.floor(s / 86400)} ngày`
  return new Date(iso).toLocaleDateString('vi-VN')
}

const PAGE = 20

export function ShortComments({ shortId, total, onClose, onCountChange }: Props) {
  const { data: session, status } = useSession()
  const [items, setItems] = useState<Comment[]>([])
  const [count, setCount] = useState(total)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (skip: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/shorts/${shortId}/comments?skip=${skip}&limit=${PAGE}`)
      const json = await res.json()
      if (json?.success) {
        setItems((prev) => (skip === 0 ? json.data.items : [...prev, ...json.data.items]))
        setCount(json.data.total)
        setHasMore(skip + json.data.items.length < json.data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [shortId])

  useEffect(() => { load(0) }, [load])

  // Esc closes the sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = text.trim()
    if (!content || sending) return
    if (status !== 'authenticated') {
      authModalStore.open('login')
      return
    }
    setSending(true)
    try {
      const res = await fetch(`/api/v1/shorts/${shortId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        toast.error(json?.error || 'Không gửi được bình luận', { icon: null })
        return
      }
      setItems((prev) => [json.data, ...prev])
      setCount((c) => { onCountChange(c + 1); return c + 1 })
      setText('')
    } catch {
      toast.error('Lỗi kết nối', { icon: null })
    } finally {
      setSending(false)
    }
  }

  const remove = async (id: string) => {
    const res = await fetch(`/api/v1/shorts/${shortId}/comments/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Không xoá được bình luận', { icon: null })
      return
    }
    setItems((prev) => prev.filter((c) => c.id !== id))
    setCount((c) => { onCountChange(c - 1); return c - 1 })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-stretch md:justify-end" role="dialog" aria-label="Bình luận">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-black/50 md:bg-black/30" onClick={onClose} />

      <div className="relative flex h-[70dvh] w-full flex-col rounded-t-3xl border-t border-white/10 bg-[#0d1117] md:h-full md:w-[400px] md:rounded-none md:border-l md:border-t-0 md:pt-16 animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h3 className="text-sm font-bold text-white">{formatCount(count)} bình luận</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {items.map((c) => (
            <div key={c.id} className="group flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.user.avatar || '/placeholder-user.jpg'}
                alt={c.user.name || ''}
                className="h-9 w-9 shrink-0 rounded-full border border-white/10 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white/60">{c.user.name || 'Người dùng'}</p>
                <p className="mt-0.5 whitespace-pre-line break-words text-sm text-white/90">{c.content}</p>
                <p className="mt-1 text-[11px] text-white/35">{timeAgo(c.createdAt)}</p>
              </div>
              {session?.user?.id === c.user.id && (
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="self-start rounded-full p-1.5 text-white/30 opacity-0 transition hover:bg-white/10 hover:text-red-400 group-hover:opacity-100"
                  aria-label="Xoá bình luận"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          )}
          {!loading && items.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center text-white/40">
              <MessageCircle className="mb-3 h-10 w-10 text-white/15" />
              <p className="text-sm">Chưa có bình luận nào</p>
              <p className="text-xs">Hãy là người đầu tiên bình luận!</p>
            </div>
          )}
          {!loading && hasMore && (
            <button type="button" onClick={() => load(items.length)} className="w-full py-2 text-xs font-semibold text-primary hover:underline">
              Xem thêm bình luận
            </button>
          )}
        </div>

        <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => status === 'unauthenticated' && authModalStore.open('login')}
            maxLength={500}
            placeholder={status === 'authenticated' ? 'Thêm bình luận…' : 'Đăng nhập để bình luận'}
            className="h-11 flex-1 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-white/35 focus:border-primary/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-teal-950 transition hover:brightness-110 disabled:opacity-40"
            aria-label="Gửi"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}
