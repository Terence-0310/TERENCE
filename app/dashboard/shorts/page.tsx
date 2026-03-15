'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, Edit, Trash2, Eye, RefreshCw, Video, X, Save,
  RotateCcw, Upload, EyeOff, Send, Film, Heart, Share2, Bookmark,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ShortItem {
  id: string; title: string; slug: string; description: string | null
  videoUrl: string | null; sourceType: string; thumbnailUrl: string | null
  duration: number | null; hashtags: string | null; status: string
  viewCount: number; likeCount: number; shareCount: number; saveCount: number
  movieId: string | null; createdBy: string | null; createdAt: string
  deletedAt: string | null; movie?: { id: string; title: string } | null
}

interface Pagination { page: number; limit: number; total: number; totalPages: number }

export default function ShortsPage() {
  const [shorts, setShorts] = useState<ShortItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [specialFilter, setSpecialFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editShort, setEditShort] = useState<ShortItem | null>(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = { title: '', slug: '', description: '', videoUrl: '', sourceType: 'mp4', thumbnailUrl: '', duration: '', hashtags: '', status: 'draft', movieId: '' }
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)

  const fetchShorts = useCallback(async (page = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20', sortBy })
    if (search) params.set('search', search)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (specialFilter === 'deleted') params.set('deleted', 'true')
    try {
      const res = await fetch(`/api/admin/shorts?${params}`)
      const json = await res.json()
      setShorts(json.data || [])
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch { setShorts([]) }
    setLoading(false)
  }, [search, statusFilter, sortBy, specialFilter])

  useEffect(() => { fetchShorts() }, [fetchShorts])

  const generateSlug = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 200)

  const stats = {
    total: pagination.total,
    published: shorts.filter(s => s.status === 'published').length,
    draft: shorts.filter(s => s.status === 'draft').length,
    totalViews: shorts.reduce((a, s) => a + s.viewCount, 0),
    totalLikes: shorts.reduce((a, s) => a + s.likeCount, 0),
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const body = {
        ...form,
        slug: form.slug || generateSlug(form.title),
        duration: form.duration ? Number(form.duration) : undefined,
        movieId: form.movieId || null,
      }
      const res = await fetch('/api/admin/shorts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { setShowAddModal(false); setForm(emptyForm); fetchShorts() }
      else { const d = await res.json(); alert(d.error || 'Lỗi') }
    } catch { alert('Lỗi kết nối') }
    setSaving(false)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editShort) return; setSaving(true)
    try {
      const body: Record<string, unknown> = {}
      if (editForm.title !== editShort.title) body.title = editForm.title
      if (editForm.slug !== editShort.slug) body.slug = editForm.slug
      if (editForm.description !== (editShort.description || '')) body.description = editForm.description || null
      if (editForm.videoUrl !== (editShort.videoUrl || '')) body.videoUrl = editForm.videoUrl
      if (editForm.sourceType !== editShort.sourceType) body.sourceType = editForm.sourceType
      if (editForm.thumbnailUrl !== (editShort.thumbnailUrl || '')) body.thumbnailUrl = editForm.thumbnailUrl || null
      if (editForm.hashtags !== (editShort.hashtags || '')) body.hashtags = editForm.hashtags || null
      if (editForm.status !== editShort.status) body.status = editForm.status
      if (editForm.movieId !== (editShort.movieId || '')) body.movieId = editForm.movieId || null
      const dur = editForm.duration ? Number(editForm.duration) : null
      if (dur !== editShort.duration) body.duration = dur

      if (Object.keys(body).length === 0) { setEditShort(null); setSaving(false); return }
      const res = await fetch(`/api/admin/shorts/${editShort.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { setEditShort(null); fetchShorts(pagination.page) }
      else { const d = await res.json(); alert(d.error || 'Lỗi') }
    } catch { alert('Lỗi kết nối') }
    setSaving(false)
  }

  const openEdit = (s: ShortItem) => {
    setEditShort(s)
    setEditForm({
      title: s.title, slug: s.slug, description: s.description || '',
      videoUrl: s.videoUrl || '', sourceType: s.sourceType,
      thumbnailUrl: s.thumbnailUrl || '', duration: s.duration ? String(s.duration) : '',
      hashtags: s.hashtags || '', status: s.status, movieId: s.movieId || '',
    })
  }

  const doAction = async (id: string, action: string, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return
    const res = await fetch(`/api/admin/shorts/${id}/${action}`, { method: 'POST' })
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Lỗi'); return }
    fetchShorts(pagination.page)
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Xóa short "${title}"? (soft delete)`)) return
    const res = await fetch(`/api/admin/shorts/${id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Lỗi'); return }
    fetchShorts(pagination.page)
  }

  const statusLabel = (s: string) => ({ published: 'Đã xuất bản', draft: 'Nháp', hidden: 'Ẩn', archived: 'Lưu trữ' }[s] || s)
  const statusColor = (s: string) => ({
    published: 'bg-green-500/10 text-green-500', draft: 'bg-muted text-muted-foreground',
    hidden: 'bg-red-500/10 text-red-500', archived: 'bg-yellow-500/10 text-yellow-500',
  }[s] || 'bg-muted text-muted-foreground')
  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
  const fmtDur = (d: number | null) => d ? `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}` : '—'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Short Video</h1>
          <p className="text-muted-foreground">Quản lý video ngắn kiểu TikTok/Reels</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2"><Plus className="w-4 h-4" /> Thêm short</Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="bg-card border-border"><CardContent className="p-4"><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Tổng short</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><p className="text-2xl font-bold text-green-500">{stats.published}</p><p className="text-sm text-muted-foreground">Đã xuất bản</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><p className="text-2xl font-bold text-muted-foreground">{stats.draft}</p><p className="text-sm text-muted-foreground">Nháp</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><p className="text-2xl font-bold text-primary">{fmtNum(stats.totalViews)}</p><p className="text-sm text-muted-foreground">Tổng views</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><p className="text-2xl font-bold text-red-400">{fmtNum(stats.totalLikes)}</p><p className="text-sm text-muted-foreground">Tổng likes</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border"><CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Tìm theo tiêu đề, slug, hashtag..." className="pl-9 bg-muted border-border" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="icon" onClick={() => fetchShorts()}><RefreshCw className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="published">Đã xuất bản</option>
              <option value="draft">Nháp</option>
              <option value="hidden">Ẩn</option>
              <option value="archived">Lưu trữ</option>
            </select>
            <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm" value={specialFilter} onChange={(e) => setSpecialFilter(e.target.value)}>
              <option value="all">Tất cả</option>
              <option value="deleted">🗑️ Đã xóa</option>
            </select>
            <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="views">Nhiều views</option>
              <option value="likes">Nhiều likes</option>
              <option value="title">Theo tên A→Z</option>
            </select>
          </div>
        </div>
      </CardContent></Card>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-lg">Danh sách short ({pagination.total})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div> : (
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Short</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Thống kê</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Trạng thái</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Phim gốc</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Thời lượng</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Thao tác</th>
          </tr></thead><tbody>
            {shorts.map((s) => (
              <tr key={s.id} className={`border-b border-border hover:bg-muted/50 transition-colors ${s.deletedAt ? 'opacity-50' : ''}`}>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.slug}</p>
                      {s.hashtags && <p className="text-xs text-primary/70 truncate">{s.hashtags}</p>}
                      {s.deletedAt && <p className="text-xs text-red-400">Đã xóa</p>}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{fmtNum(s.viewCount)}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{fmtNum(s.likeCount)}</span>
                    <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{fmtNum(s.shareCount)}</span>
                    <span className="flex items-center gap-1"><Bookmark className="w-3 h-3" />{fmtNum(s.saveCount)}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(s.status)}`}>{statusLabel(s.status)}</span>
                </td>
                <td className="py-4 px-4 text-muted-foreground text-sm">
                  {s.movie ? <span className="flex items-center gap-1"><Film className="w-3 h-3" />{s.movie.title}</span> : '—'}
                </td>
                <td className="py-4 px-4 text-muted-foreground text-sm">{fmtDur(s.duration)}</td>
                <td className="py-4 px-4">
                  <div className="flex items-center justify-end gap-1">
                    {s.deletedAt ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Khôi phục"
                        onClick={() => doAction(s.id, 'restore', `Khôi phục "${s.title}"?`)}>
                        <RotateCcw className="w-4 h-4 text-green-500" />
                      </Button>
                    ) : (
                      <>
                        {s.status !== 'published' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Xuất bản"
                            onClick={() => doAction(s.id, 'publish')}>
                            <Send className="w-4 h-4 text-green-500" />
                          </Button>
                        )}
                        {s.status === 'published' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Ẩn"
                            onClick={() => doAction(s.id, 'hide')}>
                            <EyeOff className="w-4 h-4 text-yellow-500" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Sửa" onClick={() => openEdit(s)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Xóa"
                          onClick={() => handleDelete(s.id, s.title)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {shorts.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Không có short nào</td></tr>}
          </tbody></table></div>)}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Trang {pagination.page}/{pagination.totalPages} — {pagination.total} short</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchShorts(pagination.page - 1)}>Trước</Button>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchShorts(pagination.page + 1)}>Sau</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Thêm Short</h2>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div><label className="text-sm font-medium">Tiêu đề *</label>
                <Input className="mt-1 bg-muted border-border" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: generateSlug(e.target.value) })} required /></div>
              <div><label className="text-sm font-medium">Slug</label>
                <Input className="mt-1 bg-muted border-border" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Tự sinh từ tiêu đề" /></div>
              <div><label className="text-sm font-medium">Video URL *</label>
                <Input className="mt-1 bg-muted border-border" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Loại nguồn</label>
                  <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg" value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })}>
                    <option value="mp4">MP4</option><option value="hls">HLS</option>
                    <option value="youtube">YouTube</option><option value="iframe">iFrame</option>
                  </select></div>
                <div><label className="text-sm font-medium">Thời lượng (giây)</label>
                  <Input type="number" className="mt-1 bg-muted border-border" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
              </div>
              <div><label className="text-sm font-medium">Thumbnail URL</label>
                <Input className="mt-1 bg-muted border-border" value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Hashtags</label>
                <Input className="mt-1 bg-muted border-border" placeholder="#hanh_dong, #moi" value={form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Movie ID (liên kết phim)</label>
                <Input className="mt-1 bg-muted border-border" placeholder="Optional" value={form.movieId} onChange={(e) => setForm({ ...form, movieId: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Mô tả</label>
                <textarea className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg h-20 resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Hủy</Button>
                <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Đang lưu...' : 'Thêm'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editShort && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditShort(null)} />
          <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Sửa Short</h2>
              <button onClick={() => setEditShort(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form className="space-y-4" onSubmit={handleEdit}>
              <div><label className="text-sm font-medium">Tiêu đề</label>
                <Input className="mt-1 bg-muted border-border" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required /></div>
              <div><label className="text-sm font-medium">Slug</label>
                <Input className="mt-1 bg-muted border-border" value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Video URL</label>
                <Input className="mt-1 bg-muted border-border" value={editForm.videoUrl} onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="text-sm font-medium">Loại nguồn</label>
                  <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg" value={editForm.sourceType} onChange={(e) => setEditForm({ ...editForm, sourceType: e.target.value })}>
                    <option value="mp4">MP4</option><option value="hls">HLS</option>
                    <option value="youtube">YouTube</option><option value="iframe">iFrame</option>
                  </select></div>
                <div><label className="text-sm font-medium">Trạng thái</label>
                  <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="draft">Nháp</option><option value="published">Xuất bản</option>
                    <option value="hidden">Ẩn</option><option value="archived">Lưu trữ</option>
                  </select></div>
                <div><label className="text-sm font-medium">Thời lượng (s)</label>
                  <Input type="number" className="mt-1 bg-muted border-border" value={editForm.duration} onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })} /></div>
              </div>
              <div><label className="text-sm font-medium">Thumbnail URL</label>
                <Input className="mt-1 bg-muted border-border" value={editForm.thumbnailUrl} onChange={(e) => setEditForm({ ...editForm, thumbnailUrl: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Hashtags</label>
                <Input className="mt-1 bg-muted border-border" value={editForm.hashtags} onChange={(e) => setEditForm({ ...editForm, hashtags: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Movie ID</label>
                <Input className="mt-1 bg-muted border-border" value={editForm.movieId} onChange={(e) => setEditForm({ ...editForm, movieId: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Mô tả</label>
                <textarea className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg h-20 resize-none" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>👁 {editShort.viewCount} views — ❤️ {editShort.likeCount} likes — ↗️ {editShort.shareCount} shares — 🔖 {editShort.saveCount} saves</p>
                <p>Tạo bởi: {editShort.createdBy || '—'} — Ngày: {new Date(editShort.createdAt).toLocaleString('vi')}</p>
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditShort(null)}>Hủy</Button>
                <Button type="submit" className="flex-1 gap-2" disabled={saving}>
                  <Save className="w-4 h-4" />{saving ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
