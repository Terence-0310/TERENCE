'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Edit, Trash2, RefreshCw, X, Save, Newspaper, Eye, EyeOff, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface NewsItem {
  id: string; title: string; slug: string; excerpt: string | null; coverImage: string | null
  status: string; createdAt: string; authorId: string | null
}
interface Pagination { page: number; limit: number; total: number; totalPages: number }

export default function NewsPage() {
  const [posts, setPosts] = useState<NewsItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editPost, setEditPost] = useState<NewsItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', slug: '', content: '', excerpt: '', coverImage: '', status: 'draft' })

  const fetchPosts = useCallback(async (page = 1) => {
    setLoading(true)
    const p = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) p.set('search', search)
    if (statusFilter) p.set('status', statusFilter)
    try {
      const res = await fetch(`/api/admin/news?${p}`)
      const json = await res.json()
      setPosts(json.data || [])
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch { setPosts([]) }
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const autoSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9\u00C0-\u024F]+/gi, '-').replace(/(^-|-$)/g, '').substring(0, 80)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const res = await fetch('/api/admin/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { setShowAdd(false); setForm({ title: '', slug: '', content: '', excerpt: '', coverImage: '', status: 'draft' }); fetchPosts() }
    else { const d = await res.json(); alert(d.error || 'Lỗi') }
    setSaving(false)
  }

  const handleUpdate = async (id: string, data: any) => {
    await fetch(`/api/admin/news/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    fetchPosts(pagination.page)
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Xóa bài viết "${title}"?`)) return
    await fetch(`/api/admin/news/${id}`, { method: 'DELETE' })
    fetchPosts(pagination.page)
  }

  const statusColor = (s: string) => ({ published: 'bg-green-500/10 text-green-500', draft: 'bg-muted text-muted-foreground', archived: 'bg-blue-500/10 text-blue-500' }[s] || 'bg-muted text-muted-foreground')
  const statusLabel = (s: string) => ({ published: 'Đã xuất bản', draft: 'Nháp', archived: 'Lưu trữ' }[s] || s)
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Newspaper className="h-6 w-6 text-primary" /> Quản lý tin tức</h1>
          <p className="text-muted-foreground">Bài viết và tin tức phim</p>
        </div>
        <Button className="gap-2" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Thêm bài viết</Button>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border"><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Tìm theo tiêu đề..." className="pl-9 bg-muted border-border" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Nháp</option>
            <option value="archived">Lưu trữ</option>
          </select>
          <Button variant="outline" size="icon" onClick={() => fetchPosts()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardContent></Card>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-lg">Bài viết ({pagination.total})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tiêu đề</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tác giả</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Trạng thái</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ngày tạo</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-medium truncate max-w-[300px]">{post.title}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{post.slug}</p>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">{post.authorId ? post.authorId.slice(0, 8) + '...' : '—'}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(post.status)}`}>{statusLabel(post.status)}</span>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">{fmtDate(post.createdAt)}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-1">
                          {post.status !== 'published' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Xuất bản" onClick={() => handleUpdate(post.id, { status: 'published' })}>
                              <Globe className="w-4 h-4 text-green-500" />
                            </Button>
                          )}
                          {post.status === 'published' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Ẩn" onClick={() => handleUpdate(post.id, { status: 'draft' })}>
                              <EyeOff className="w-4 h-4 text-yellow-500" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Xóa" onClick={() => handleDelete(post.id, post.title)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {posts.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Không có bài viết nào</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Trang {pagination.page}/{pagination.totalPages} — {pagination.total} bài viết</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchPosts(pagination.page - 1)}>Trước</Button>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchPosts(pagination.page + 1)}>Sau</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdd(false)} />
          <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Thêm bài viết</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div>
                <label className="text-sm font-medium">Tiêu đề *</label>
                <Input className="mt-1 bg-muted border-border" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: autoSlug(e.target.value) })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Slug</label>
                <Input className="mt-1 bg-muted border-border" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Mô tả ngắn</label>
                <Input className="mt-1 bg-muted border-border" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Nội dung *</label>
                <textarea className="mt-1 w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm min-h-[200px] outline-none focus:border-primary" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Ảnh bìa URL</label>
                <Input className="mt-1 bg-muted border-border" value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium">Trạng thái</label>
                <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">Nháp</option>
                  <option value="published">Xuất bản ngay</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Hủy</Button>
                <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Đang lưu...' : 'Tạo bài viết'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
