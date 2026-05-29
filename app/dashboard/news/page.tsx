'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus, Search, Edit, Trash2, RefreshCw, Eye, Calendar, User, EyeOff, Sparkles
} from 'lucide-react'
import { Button } from '@/src/fe/components/ui/button'
import { Input } from '@/src/fe/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/fe/components/ui/card'
import { ConfirmModal } from '@/src/fe/components/ui/confirm-modal'
import { toast } from 'sonner'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'

interface NewsPost {
  id: string
  title: string
  slug: string
  status: string
  viewCount: number
  coverImage: string | null
  createdAt: string
  author?: { name: string }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function NewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  // Confirm Modal state
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string, title: string }>({
    isOpen: false, id: '', title: ''
  })

  // AI generation modal state
  const [aiOpen, setAiOpen] = useState(false)
  const [aiSource, setAiSource] = useState<'now_playing' | 'popular' | 'top_rated' | 'upcoming'>('now_playing')
  const [aiCount, setAiCount] = useState(5)
  const [aiBusy, setAiBusy] = useState(false)

  const { user: currentUser } = useAuth()
  const currentUserRole = currentUser?.role?.toUpperCase() || ''

  const fetchPosts = useCallback(async (page = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '12' })
    if (search) params.set('search', search)
    if (statusFilter !== 'all') params.set('status', statusFilter)

    try {
      const res = await fetch(`/api/admin/news?${params}`)
      const json = await res.json()
      if (res.ok) {
        const payload = json.success ? json.data : json
        setPosts(payload.data || [])
        setPagination(payload.pagination || { page, limit: 12, total: 0, totalPages: 0 })
      } else {
        toast.error('Lỗi khi tải danh sách bài viết')
      }
    } catch {
      toast.error('Không thể kết nối đến máy chủ')
    }
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => {
    fetchPosts(1)
  }, [fetchPosts])

  const handleDelete = async () => {
    const { id } = confirmDelete
    if (!id) return
    
    try {
      const res = await fetch(`/api/admin/news/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Xóa bài viết thành công')
        fetchPosts(pagination.page)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Lỗi khi xóa bài viết')
      }
    } catch {
      toast.error('Lỗi kết nối')
    }
  }

  const handleAiGenerate = async () => {
    setAiBusy(true)
    try {
      const res = await fetch('/api/admin/news/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: aiSource, count: aiCount }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const s = data.summary || {}
        toast.success(`AI sinh xong: ${s.created ?? 0} bài mới, ${s.skipped ?? 0} bỏ qua, ${s.errors ?? 0} lỗi`)
        setAiOpen(false)
        fetchPosts(1)
      } else {
        toast.error(data.error || 'AI sinh bài thất bại')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi kết nối')
    } finally {
      setAiBusy(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/news/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast.success('Cập nhật trạng thái thành công')
        fetchPosts(pagination.page)
      } else {
        toast.error('Lỗi khi cập nhật trạng thái')
      }
    } catch {
      toast.error('Lỗi kết nối')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'draft': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      case 'hidden': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'Đã xuất bản'
      case 'draft': return 'Bản nháp'
      case 'hidden': return 'Đã ẩn'
      default: return status
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tin tức & Bài viết</h1>
          <p className="text-muted-foreground">Quản lý các bài viết trên hệ thống CMS</p>
        </div>
        {['SUPER_ADMIN', 'ADMIN', 'EDITOR'].includes(currentUserRole) && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setAiOpen(true)}
              className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
              title="Dùng Gemini sinh bài viết từ TMDB"
            >
              <Sparkles className="w-4 h-4" /> Sinh bằng AI
            </Button>
            <Link href="/dashboard/news/new">
              <Button className="gap-2 shadow-lg hover:shadow-primary/25 transition-all duration-300">
                <Plus className="w-4 h-4" /> Viết bài mới
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Tìm kiếm tiêu đề bài viết..." 
                className="pl-9 bg-muted/50 border-border transition-all focus:bg-background"
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && fetchPosts(1)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select 
                className="px-4 py-2 h-10 bg-muted/50 border border-border rounded-md text-sm outline-none cursor-pointer hover:bg-muted transition-colors focus:ring-2 focus:ring-primary/20"
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="published">Đã xuất bản</option>
                <option value="draft">Bản nháp</option>
                <option value="hidden">Đã ẩn</option>
              </select>
              <Button variant="outline" size="icon" onClick={() => fetchPosts(1)} className="shrink-0">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Danh sách bài viết</span>
            <span className="text-sm font-normal text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
              Tổng số: {pagination.total}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && posts.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex flex-col bg-muted/10 border border-border/50 rounded-xl overflow-hidden">
                  <div className="aspect-video w-full bg-muted animate-pulse" />
                  <div className="p-4 flex flex-col gap-3">
                    <div className="h-5 w-full bg-muted rounded animate-pulse" />
                    <div className="h-5 w-2/3 bg-muted rounded animate-pulse" />
                    <div className="flex items-center justify-between mt-3">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium text-foreground">Không tìm thấy bài viết</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Hãy thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc trạng thái.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
              {posts.map((post) => (
                <div key={post.id} className="group relative flex flex-col bg-muted/20 border border-border/50 rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all duration-300">
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    {post.coverImage ? (
                      <img 
                        src={post.coverImage} 
                        alt={post.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40 bg-gradient-to-br from-muted to-muted/50">
                        <EyeOff className="w-8 h-8 mb-2" />
                        <span className="text-xs font-medium">Chưa có ảnh bìa</span>
                      </div>
                    )}
                    
                    {/* Status Badge — click to toggle published/draft */}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        const next = post.status === 'published' ? 'draft' : 'published'
                        handleUpdateStatus(post.id, next)
                      }}
                      className="absolute top-3 left-3 z-10"
                      title="Bấm để chuyển trạng thái"
                    >
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border backdrop-blur-md cursor-pointer hover:opacity-80 transition ${getStatusColor(post.status)}`}>
                        {getStatusLabel(post.status)}
                      </span>
                    </button>

                    {/* Quick Actions Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 backdrop-blur-[2px]">
                      <Link href={`/news/${post.slug}`} target="_blank">
                        <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full hover:scale-110 transition-transform" title="Xem trên web">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/dashboard/news/${post.id}`}>
                        <Button variant="default" size="icon" className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 hover:scale-110 transition-transform" title="Chỉnh sửa">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="h-9 w-9 rounded-full hover:scale-110 transition-transform" 
                        title="Xóa"
                        onClick={() => setConfirmDelete({ isOpen: true, id: post.id, title: post.title })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Content Info */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-foreground line-clamp-2 leading-tight mb-3 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    
                    <div className="mt-auto space-y-2">
                      <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span className="truncate">{post.author?.name || 'Hệ thống'}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded text-foreground/70">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="font-medium">{post.viewCount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border bg-muted/10">
              <p className="text-sm text-muted-foreground font-medium">
                Trang {pagination.page}/{pagination.totalPages || 1}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="w-8 h-8 hover:bg-muted" disabled={pagination.page <= 1} onClick={() => fetchPosts(1)}>«</Button>
                <Button variant="outline" size="icon" className="w-8 h-8 hover:bg-muted" disabled={pagination.page <= 1} onClick={() => fetchPosts(pagination.page - 1)}>‹</Button>
                
                <div className="px-3 py-1 text-sm font-bold bg-primary text-primary-foreground rounded-md mx-1 shadow-sm">
                  {pagination.page}
                </div>

                <Button variant="outline" size="icon" className="w-8 h-8 hover:bg-muted" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchPosts(pagination.page + 1)}>›</Button>
                <Button variant="outline" size="icon" className="w-8 h-8 hover:bg-muted" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchPosts(pagination.totalPages)}>»</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reusable Confirm Modal */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: '', title: '' })}
        onConfirm={handleDelete}
        title="Xóa bài viết"
        description={<>Bạn có chắc chắn muốn xóa bài viết <strong>{confirmDelete.title}</strong>? Hành động này không thể hoàn tác.</>}
        confirmText="Xóa bài viết"
        variant="destructive"
      />

      {/* AI Generation Modal */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold">Sinh bài viết bằng AI</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              TMDB → Gemini → NewsPost. Bài đã tồn tại (theo slug) sẽ tự động bỏ qua.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Nguồn phim
                </label>
                <select
                  value={aiSource}
                  onChange={(e) => setAiSource(e.target.value as typeof aiSource)}
                  disabled={aiBusy}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="now_playing">Đang chiếu (Now Playing)</option>
                  <option value="popular">Đang hot (Popular)</option>
                  <option value="upcoming">Sắp chiếu (Upcoming)</option>
                  <option value="top_rated">Đánh giá cao (Top Rated)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Số lượng bài (1-20)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={aiCount}
                  onChange={(e) => setAiCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                  disabled={aiBusy}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Mỗi bài tốn ~1 request Gemini. Free tier: 15/phút, 1500/ngày.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAiOpen(false)}
                disabled={aiBusy}
              >
                Huỷ
              </Button>
              <Button
                onClick={handleAiGenerate}
                disabled={aiBusy}
                className="gap-2"
              >
                {aiBusy ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang sinh ({aiCount} bài)…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Bắt đầu sinh
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
