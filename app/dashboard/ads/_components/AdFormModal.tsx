'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'

const TYPES = ['VIDEO', 'IMAGE', 'BANNER'] as const
const PLACEMENTS = ['PRE_ROLL', 'MID_ROLL', 'HOME_BANNER', 'DETAIL_BANNER'] as const

const PLACEMENT_LABEL: Record<string, string> = {
  PRE_ROLL: 'Trước phim (Pre-roll)',
  MID_ROLL: 'Giữa phim (Mid-roll)',
  HOME_BANNER: 'Banner trang chủ',
  DETAIL_BANNER: 'Banner trang phim',
}

const TYPE_LABEL: Record<string, string> = {
  VIDEO: 'Video',
  IMAGE: 'Ảnh',
  BANNER: 'Banner',
}

export interface AdRow {
  id: string
  title: string
  type: string
  placement: string
  duration: number | null
  mediaUrl: string
  targetUrl: string | null
  skipAfterSeconds: number | null
  priority: number
  isActive: boolean
  startAt: string | null
  endAt: string | null
}

interface Props {
  initial: AdRow | null
  onClose: () => void
  onSaved: () => void
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  // strip seconds + zone so <input type="datetime-local"> accepts it
  return d.toISOString().slice(0, 16)
}

export function AdFormModal({ initial, onClose, onSaved }: Props) {
  const isEdit = !!initial
  const [busy, setBusy] = useState(false)

  const [form, setForm] = useState<{
    title: string
    type: (typeof TYPES)[number]
    placement: (typeof PLACEMENTS)[number]
    duration: number | null
    mediaUrl: string
    targetUrl: string
    skipAfterSeconds: number | null
    priority: number
    isActive: boolean
    startAt: string
    endAt: string
  }>({
    title: initial?.title ?? '',
    type: (initial?.type as typeof TYPES[number]) ?? 'VIDEO',
    placement: (initial?.placement as typeof PLACEMENTS[number]) ?? 'PRE_ROLL',
    duration: initial?.duration ?? 15,
    mediaUrl: initial?.mediaUrl ?? '',
    targetUrl: initial?.targetUrl ?? '',
    skipAfterSeconds: initial?.skipAfterSeconds ?? 5,
    priority: initial?.priority ?? 0,
    isActive: initial?.isActive ?? true,
    startAt: toDatetimeLocal(initial?.startAt ?? null),
    endAt: toDatetimeLocal(initial?.endAt ?? null),
  })

  // When user switches type to IMAGE/BANNER, blank out video-only fields
  // to avoid leaving stale values that fail server validation.
  useEffect(() => {
    if (form.type !== 'VIDEO') {
      if (form.duration != null || form.skipAfterSeconds != null) {
        setForm((f) => ({ ...f, duration: null, skipAfterSeconds: null }))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type])

  async function submit() {
    setBusy(true)
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        placement: form.placement,
        duration: form.type === 'VIDEO' ? Number(form.duration) || null : null,
        mediaUrl: form.mediaUrl.trim(),
        targetUrl: form.targetUrl.trim() || null,
        skipAfterSeconds: form.type === 'VIDEO' && form.skipAfterSeconds != null
          ? Number(form.skipAfterSeconds)
          : null,
        priority: Number(form.priority) || 0,
        isActive: form.isActive,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
      }

      const url = isEdit ? `/api/admin/ads/${initial!.id}` : '/api/admin/ads'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Lưu thất bại', { icon: null })
        return
      }
      toast.success(isEdit ? 'Đã cập nhật quảng cáo' : 'Đã tạo quảng cáo', { icon: null })
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || 'Lưu thất bại', { icon: null })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-zinc-900 border border-white/10 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} disabled={busy} className="absolute top-3 right-3 rounded-md p-1.5 text-white/60 hover:text-white hover:bg-white/5 transition disabled:opacity-50">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-1">{isEdit ? 'Sửa quảng cáo' : 'Tạo quảng cáo mới'}</h3>
        <p className="text-xs text-white/40 mb-5">
          {form.type === 'VIDEO' ? 'Video ads hỗ trợ 15 / 30 / 60s với nút bỏ qua.' : 'Banner & image hiển thị toàn thời gian trên placement đã chọn.'}
        </p>

        <div className="space-y-4">
          <Field label="Tiêu đề">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-primary/50" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Loại">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof TYPES[number] })}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-primary/50">
                {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </Field>
            <Field label="Vị trí">
              <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as typeof PLACEMENTS[number] })}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-primary/50">
                {PLACEMENTS.map((p) => <option key={p} value={p}>{PLACEMENT_LABEL[p]}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Media URL">
            <input value={form.mediaUrl} onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-primary/50" />
          </Field>

          <Field label="Target URL (click-through, optional)">
            <input value={form.targetUrl} onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-primary/50" />
          </Field>

          {form.type === 'VIDEO' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Thời lượng (giây)">
                <select value={form.duration ?? 15} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-primary/50">
                  <option value={15}>15s</option>
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                </select>
              </Field>
              <Field label="Cho phép bỏ qua sau (giây)">
                <input type="number" min={0} value={form.skipAfterSeconds ?? ''} onChange={(e) => setForm({ ...form, skipAfterSeconds: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder="Bỏ trống = không cho skip"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-primary/50" />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Bắt đầu">
              <input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-primary/50" />
            </Field>
            <Field label="Kết thúc">
              <input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-primary/50" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority (cao = ưu tiên)">
              <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-primary/50" />
            </Field>
            <Field label="Trạng thái">
              <label className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-primary" />
                <span className="text-sm text-white/80">{form.isActive ? 'Đang chạy' : 'Tắt'}</span>
              </label>
            </Field>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={onClose} disabled={busy} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition disabled:opacity-50">
            Huỷ
          </button>
          <button onClick={submit} disabled={busy} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50">
            {busy ? 'Đang lưu…' : (isEdit ? 'Cập nhật' : 'Tạo quảng cáo')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
