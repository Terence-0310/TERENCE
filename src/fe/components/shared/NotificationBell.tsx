'use client'

// ============================================
// NotificationBell — realtime in-app notifications
// ============================================
// Renders a bell with an unread badge + a dropdown list. Backed by
// useNotifications() which seeds from /api/v1/notifications and prepends
// live `notification:new` socket events. Renders nothing for guests.

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check } from 'lucide-react'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'
import { useNotifications } from '@/src/fe/lib/realtime/hooks'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'vừa xong'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} ngày trước`
  return new Date(iso).toLocaleDateString('vi-VN')
}

export function NotificationBell() {
  const router = useRouter()
  const { user } = useAuth()
  const { items, unreadCount, markAllRead } = useNotifications(user?.id ?? null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          const next = !open
          setOpen(next)
          if (next && unreadCount > 0) void markAllRead()
        }}
        aria-label="Thông báo"
        className="relative rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl border border-white/[0.08] bg-background/98 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-bold text-white">Thông báo</span>
            {items.some((n) => !n.isRead) && (
              <button
                onClick={() => void markAllRead()}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80"
              >
                <Check className="h-3 w-3" /> Đánh dấu đã đọc
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-white/15" />
                <p className="text-sm text-white/40">Chưa có thông báo nào</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setOpen(false)
                    if (n.link) router.push(n.link)
                  }}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-white/[0.04] px-4 py-3 text-left transition hover:bg-white/5 ${
                    n.isRead ? '' : 'bg-primary/[0.06]'
                  }`}
                >
                  <div className="flex w-full items-start gap-2">
                    {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-white/90">{n.title}</p>
                      {n.message && <p className="mt-0.5 text-[12px] text-white/50 leading-snug">{n.message}</p>}
                      <p className="mt-1 text-[10px] text-white/30">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
