'use client'

import { useState } from 'react'
import { Send, Megaphone, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function BroadcastNotificationsPage() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return toast.error('Nhập tiêu đề thông báo')
    if (!confirm('Gửi thông báo này tới TẤT CẢ người dùng?')) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), link: link.trim() }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Gửi thất bại')
      toast.success(`Đã gửi tới ${body.recipients?.toLocaleString('vi-VN') ?? '?'} người dùng`)
      setTitle(''); setMessage(''); setLink('')
    } catch (err: any) {
      toast.error(err?.message || 'Gửi thất bại')
    } finally {
      setSending(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f1623] px-4 py-2.5 text-sm text-[#25396f] dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40'

  return (
    <div className="space-y-6 font-nunito pb-10">
      <div>
        <h1 className="text-[28px] font-black text-[#25396f] dark:text-white mb-1 flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          Gửi thông báo toàn hệ thống
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Thông báo sẽ hiển thị trong chuông của tất cả người dùng và đẩy realtime tới người đang online.
        </p>
      </div>

      <form onSubmit={submit} className="max-w-2xl space-y-4 rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#151e2f] p-6 shadow-sm">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/50">Tiêu đề *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="VD: Bảo trì hệ thống lúc 23:00 hôm nay" className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/50">Nội dung</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Mô tả chi tiết (tuỳ chọn)" className={`${inputCls} resize-y`} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/50">Liên kết khi bấm vào (tuỳ chọn)</label>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="VD: /tcoin hoặc /movies" className={inputCls} />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Gửi tới tất cả
        </button>
      </form>
    </div>
  )
}
