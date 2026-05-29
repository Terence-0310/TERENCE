'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Eye, Edit2, Trash2, Power, ExternalLink, Megaphone } from 'lucide-react'
import { toast } from 'sonner'
import { AdFormModal, type AdRow } from './_components/AdFormModal'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'
import { useAdsRealtime } from '@/src/fe/lib/realtime/hooks'

const TYPE_BADGES: Record<string, string> = {
  VIDEO:  'bg-purple-500/15 text-purple-300 border-purple-500/30',
  IMAGE:  'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  BANNER: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
}

const PLACEMENT_LABEL: Record<string, string> = {
  PRE_ROLL:      'Pre-roll',
  MID_ROLL:      'Mid-roll',
  HOME_BANNER:   'Home banner',
  DETAIL_BANNER: 'Detail banner',
}

interface ListResponse {
  items: AdRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function AdminAdsPage() {
  const [items, setItems] = useState<AdRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdRow | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [preview, setPreview] = useState<AdRow | null>(null)

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [placementFilter, setPlacementFilter] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState<string>('') // '' | 'true' | 'false'
  const [q, setQ] = useState('')

  const fetchAds = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter) params.set('type', typeFilter)
      if (placementFilter) params.set('placement', placementFilter)
      if (activeFilter) params.set('isActive', activeFilter)
      if (q.trim()) params.set('q', q.trim())
      params.set('limit', '50')
      const res = await fetch(`/api/admin/ads?${params}`)
      const data = (await res.json()) as ListResponse
      if (!res.ok) throw new Error('Tải danh sách thất bại')
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      toast.error(err?.message || 'Tải danh sách thất bại', { icon: null })
    } finally {
      setLoading(false)
    }
  }, [typeFilter, placementFilter, activeFilter, q])

  useEffect(() => { fetchAds() }, [fetchAds])

  // Realtime: any admin (this tab or another) that creates / updates /
  // deletes / toggles an ad triggers a refetch here. We refetch the
  // whole list rather than patching state in place because the row
  // ordering depends on `priority desc` and current filters.
  const { user: adminUser } = useAuth()
  useAdsRealtime(adminUser?.id ?? null, {
    onCreated: () => fetchAds(),
    onUpdated: () => fetchAds(),
    onDeleted: () => fetchAds(),
  })

  async function toggleActive(id: string) {
    try {
      const res = await fetch(`/api/admin/ads/${id}?op=toggle`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Đổi trạng thái thất bại')
      toast.success('Đã đổi trạng thái', { icon: null })
      fetchAds()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi', { icon: null })
    }
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Xóa quảng cáo "${title}"?`)) return
    try {
      const res = await fetch(`/api/admin/ads/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Xóa thất bại')
      toast.success('Đã xóa quảng cáo', { icon: null })
      fetchAds()
    } catch (err: any) {
      toast.error(err?.message || 'Xóa thất bại', { icon: null })
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            Quản lý quảng cáo
          </h1>
          <p className="text-sm text-white/40 mt-1">{total} quảng cáo · banner / video / image</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" /> Thêm quảng cáo
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-card/40 border border-white/[0.06] p-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tiêu đề / URL…"
            className="w-full rounded-lg bg-white/5 border border-white/10 pl-10 pr-3 py-2 text-sm text-white outline-none focus:border-primary/50" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none">
          <option value="">Mọi loại</option>
          <option value="VIDEO">Video</option>
          <option value="IMAGE">Ảnh</option>
          <option value="BANNER">Banner</option>
        </select>
        <select value={placementFilter} onChange={(e) => setPlacementFilter(e.target.value)}
          className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none">
          <option value="">Mọi vị trí</option>
          <option value="PRE_ROLL">Pre-roll</option>
          <option value="MID_ROLL">Mid-roll</option>
          <option value="HOME_BANNER">Home banner</option>
          <option value="DETAIL_BANNER">Detail banner</option>
        </select>
        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}
          className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none">
          <option value="">Mọi trạng thái</option>
          <option value="true">Đang chạy</option>
          <option value="false">Tắt</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Tiêu đề</th>
                <th className="text-left px-3 py-3 font-semibold">Loại</th>
                <th className="text-left px-3 py-3 font-semibold">Vị trí</th>
                <th className="text-left px-3 py-3 font-semibold">Thời lượng</th>
                <th className="text-left px-3 py-3 font-semibold">Priority</th>
                <th className="text-left px-3 py-3 font-semibold">Stats</th>
                <th className="text-left px-3 py-3 font-semibold">Trạng thái</th>
                <th className="text-right px-4 py-3 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-4"><div className="h-6 rounded skeleton" /></td></tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-white/40">
                    Chưa có quảng cáo nào. Bấm <strong className="text-white/70">"Thêm quảng cáo"</strong> để tạo mới.
                  </td>
                </tr>
              ) : items.map((ad) => (
                <tr key={ad.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white truncate max-w-[280px]">{ad.title}</div>
                    <div className="text-[11px] text-white/30 truncate max-w-[280px]">{ad.mediaUrl}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${TYPE_BADGES[ad.type] || 'bg-white/5 text-white/60'}`}>
                      {ad.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-white/70">{PLACEMENT_LABEL[ad.placement] || ad.placement}</td>
                  <td className="px-3 py-3 text-white/70 tabular-nums">{ad.duration ? `${ad.duration}s` : '—'}</td>
                  <td className="px-3 py-3 text-white/70 tabular-nums">{ad.priority}</td>
                  <td className="px-3 py-3 text-[11px] text-white/40 tabular-nums">
                    <AdStats id={ad.id} />
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => toggleActive(ad.id)}
                      title={ad.isActive ? 'Bấm để tắt' : 'Bấm để bật'}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${ad.isActive ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-white/5 text-white/40 border-white/10'}`}>
                      <Power className="w-3 h-3" />
                      {ad.isActive ? 'Đang chạy' : 'Tắt'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn title="Preview" onClick={() => setPreview(ad)}><Eye className="w-4 h-4" /></IconBtn>
                      <IconBtn title="Sửa" onClick={() => setEditing(ad)}><Edit2 className="w-4 h-4" /></IconBtn>
                      <IconBtn title="Xóa" onClick={() => remove(ad.id, ad.title)} danger><Trash2 className="w-4 h-4" /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(showCreate || editing) && (
        <AdFormModal
          initial={editing}
          onClose={() => { setEditing(null); setShowCreate(false) }}
          onSaved={() => { setEditing(null); setShowCreate(false); fetchAds() }}
        />
      )}

      {preview && <AdPreviewModal ad={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title?: string; danger?: boolean }) {
  return (
    <button onClick={onClick} title={title}
      className={`rounded-md p-1.5 transition ${danger ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
      {children}
    </button>
  )
}

// Stat cell shows impression / click count fetched from the row data.
// We pull the cached counters from the list payload (already returned
// by the API) — no per-row API roundtrip.
function AdStats({ id }: { id: string }) {
  // The list endpoint returns these counters but our AdRow type
  // doesn't expose them yet. Fetch lazily on first paint.
  const [s, setS] = useState<{ impressions: number; clicks: number } | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/ads/${id}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d) setS({ impressions: d.impressionCount || 0, clicks: d.clickCount || 0 }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [id])
  if (!s) return <span>—</span>
  return <span>{s.impressions.toLocaleString()} views · {s.clicks.toLocaleString()} clicks</span>
}

function AdPreviewModal({ ad, onClose }: { ad: AdRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl rounded-2xl bg-zinc-900 border border-white/10 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{ad.title}</h3>
            <p className="text-xs text-white/40">
              {ad.type} · {PLACEMENT_LABEL[ad.placement]}{ad.duration ? ` · ${ad.duration}s` : ''}
              {ad.skipAfterSeconds != null ? ` · skip after ${ad.skipAfterSeconds}s` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-sm">Đóng</button>
        </div>

        <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
          {ad.type === 'VIDEO' ? (
            <video src={ad.mediaUrl} controls autoPlay className="w-full h-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.mediaUrl} alt={ad.title} className="w-full h-full object-contain" />
          )}
        </div>

        {ad.targetUrl && (
          <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
            Target: <a href={ad.targetUrl} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline">
              {ad.targetUrl} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
