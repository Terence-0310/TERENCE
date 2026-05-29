'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Search, Edit, Trash2, Eye, RefreshCw, Star, TrendingUp, Award,
  Globe, EyeOff, Archive, RotateCcw, ImageOff, Film, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/src/fe/components/ui/button'
import { Input } from '@/src/fe/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/fe/components/ui/card'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'

interface Movie {
  id: string; title: string; slug: string; contentType: string
  status: string; viewCount: number; posterUrl: string | null; year: number | null
  quality: string | null; isFeatured: boolean; isTrending: boolean; isRecommended: boolean
  sourceStatus: string; deletedAt: string | null; createdAt: string
  _count?: { episodes: number }
}

interface Pagination { page: number; limit: number; total: number; totalPages: number }

export default function MoviesPage() {
  const router = useRouter()
  const [movies, setMovies] = useState<Movie[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [specialFilter, setSpecialFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const { user: currentUser } = useAuth()
  const currentUserRole = currentUser?.role?.toUpperCase() || ''

  const fetchMovies = async (page = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20', sortBy })
    if (search) params.set('search', search)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (specialFilter === 'featured') params.set('featured', 'true')
    if (specialFilter === 'trending') params.set('trending', 'true')
    if (specialFilter === 'recommended') params.set('recommended', 'true')
    if (specialFilter === 'noPoster') params.set('hasPoster', 'false')
    if (specialFilter === 'noSource') params.set('hasSource', 'false')
    if (specialFilter === 'deleted') params.set('deleted', 'true')

    try {
      const res = await fetch(`/api/admin/movies?${params}`)
      const json = await res.json()
      const payload = json.success ? json.data : json
      if (payload.data && payload.data.length > 0) {
        setMovies(payload.data)
        setPagination(payload.pagination)
      } else if (payload.data && payload.data.length === 0) {
        setMovies([])
        setPagination(payload.pagination)
      } else {
        setMovies([])
        setPagination({ page: 1, limit: 20, total: 0, totalPages: 0 })
      }
    } catch { 
      setMovies([])
      setPagination({ page: 1, limit: 20, total: 0, totalPages: 0 })
    }
    setLoading(false)
  }

  useEffect(() => { 
    // Only re-fetch if filter criteria change, ensuring we start at page 1.
    fetchMovies(1) 
  }, [search, statusFilter, typeFilter, sortBy, specialFilter])

  const doAction = async (id: string, action: string, confirm_msg?: string) => {
    if (confirm_msg && !confirm(confirm_msg)) return
    
    await fetch(`/api/admin/movies/${id}/${action}`, { method: 'POST' })
    fetchMovies(pagination.page)
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Xóa mềm phim "${title}"?`)) return
    
    await fetch(`/api/admin/movies/${id}`, { method: 'DELETE' })
    fetchMovies(pagination.page)
  }

  const statusLabel = (s: string) => ({ published: 'Đã xuất bản', draft: 'Nháp', hidden: 'Ẩn', archived: 'Lưu trữ' }[s] || s)
  const statusColor = (s: string) => ({ published: 'bg-green-500/10 text-green-500 font-bold', draft: 'bg-gray-200 dark:bg-muted text-gray-700 dark:text-muted-foreground font-bold', hidden: 'bg-red-500/10 text-red-500 font-bold', archived: 'bg-blue-500/10 text-blue-500 font-bold' }[s] || 'bg-muted text-muted-foreground')
  const typeLabel = (t: string) => ({ movie: 'Phim lẻ', series: 'Phim bộ', anime: 'Anime', trailer: 'Trailer', short: 'Short' }[t] || t)
  const srcIcon = (s: string) => s === 'broken' ? 'text-red-500' : s === 'missing' ? 'text-yellow-500' : s === 'active' ? 'text-green-500' : 'text-gray-400'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý phim</h1>
          <p className="text-muted-foreground">Quản lý tất cả nội dung phim trên hệ thống</p>
        </div>
        {['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(currentUserRole) && (
          <Link href="/dashboard/movies/new">
            <Button className="gap-2"><Plus className="w-4 h-4" /> Thêm phim mới</Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Tìm theo tên, tên gốc, slug..." className="pl-9 bg-muted border-border"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Button variant="outline" size="icon" onClick={() => fetchMovies()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Tất cả trạng thái</option>
                <option value="published">Đã xuất bản</option>
                <option value="draft">Nháp</option>
                <option value="hidden">Ẩn</option>
                <option value="archived">Lưu trữ</option>
              </select>
              <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">Tất cả loại</option>
                <option value="movie">Phim lẻ</option>
                <option value="series">Phim bộ</option>
                <option value="anime">Anime</option>
                <option value="trailer">Trailer</option>
                <option value="short">Short</option>
              </select>
              <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm" value={specialFilter} onChange={(e) => setSpecialFilter(e.target.value)}>
                <option value="all">Bộ lọc đặc biệt</option>
                <option value="featured">Nổi bật</option>
                <option value="trending">Xu hướng</option>
                <option value="recommended">Đề xuất</option>
                <option value="noPoster">Thiếu poster</option>
                <option value="noSource">Thiếu nguồn</option>
                <option value="deleted">Đã xóa</option>
              </select>
              <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Mới nhất</option>
                <option value="updated">Cập nhật gần nhất</option>
                <option value="views">Nhiều lượt xem</option>
                <option value="rating">Rating cao</option>
                <option value="year">Năm phát hành</option>
                <option value="title">Theo tên A→Z</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Danh sách phim ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative min-h-[400px]">
            {loading && movies.length === 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground w-1/3">Phim</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Loại</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Views</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Trạng thái</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tập</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cờ</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-16 rounded-lg bg-muted animate-pulse shrink-0" />
                            <div className="space-y-2 flex-1">
                              <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-12 bg-muted rounded animate-pulse" /></td>
                        <td className="py-4 px-4"><div className="h-6 w-20 bg-muted rounded-full animate-pulse" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-8 bg-muted rounded animate-pulse" /></td>
                        <td className="py-4 px-4">
                          <div className="flex gap-1">
                            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex justify-end gap-1">
                            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Phim</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Loại</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Views</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Trạng thái</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tập</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cờ</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {movies.map((movie) => (
                    <tr key={movie.id} className={`border-b border-border hover:bg-muted/50 transition-colors ${movie.deletedAt ? 'opacity-50' : ''}`}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-16 rounded-lg bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                            {movie.posterUrl ? <img src={movie.posterUrl} alt={`Poster phim ${movie.title}`} loading="lazy" className="w-full h-full object-cover" /> :
                              <ImageOff className="w-5 h-5 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[200px]">{movie.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{movie.slug}</p>
                            {movie.sourceStatus !== 'active' && movie.sourceStatus !== 'pending' &&
                              <span className={`text-xs flex items-center gap-1 mt-0.5 ${srcIcon(movie.sourceStatus)}`}><AlertTriangle className="w-3 h-3" /> {movie.sourceStatus}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">{typeLabel(movie.contentType)}</td>
                      <td className="py-4 px-4 text-sm">{movie.viewCount.toLocaleString()}</td>
                      <td className="py-4 px-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(movie.status)}`}>{statusLabel(movie.status)}</span></td>
                      <td className="py-4 px-4 text-sm">{movie._count?.episodes || 0}</td>
                      <td className="py-4 px-4">
                        <div className="flex gap-1">
                          <button onClick={() => doAction(movie.id, 'feature')} title="Nổi bật">
                            <Star className={`w-4 h-4 ${movie.isFeatured ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                          </button>
                          <button onClick={() => doAction(movie.id, 'trending')} title="Xu hướng">
                            <TrendingUp className={`w-4 h-4 ${movie.isTrending ? 'text-green-500' : 'text-muted-foreground'}`} />
                          </button>
                          <button onClick={() => doAction(movie.id, 'recommend')} title="Đề xuất">
                            <Award className={`w-4 h-4 ${movie.isRecommended ? 'text-blue-500' : 'text-muted-foreground'}`} />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-1">
                          {movie.deletedAt ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Khôi phục"
                              onClick={() => doAction(movie.id, 'restore', `Khôi phục "${movie.title}"?`)}>
                              <RotateCcw className="w-4 h-4 text-green-500" />
                            </Button>
                          ) : (
                            <>
                              {movie.status !== 'published' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Xuất bản"
                                  onClick={() => doAction(movie.id, 'publish')}>
                                  <Globe className="w-4 h-4 text-green-500" />
                                </Button>
                              )}
                              {movie.status === 'published' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Ẩn"
                                  onClick={() => doAction(movie.id, 'hide')}>
                                  <EyeOff className="w-4 h-4 text-yellow-500" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Lưu trữ"
                                onClick={() => doAction(movie.id, 'archive')}>
                                <Archive className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Sửa"
                                onClick={() => router.push(`/dashboard/movies/${movie.id}/edit`)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Quản lý tập & nguồn phát"
                                onClick={() => router.push(`/dashboard/movies/${movie.id}/episodes`)}>
                                <Eye className="w-4 h-4 text-primary" />
                              </Button>
                              {['SUPER_ADMIN', 'ADMIN'].includes(currentUserRole) && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Xóa mềm"
                                  onClick={() => handleDelete(movie.id, movie.title)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {movies.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <Film className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Không có phim nào</p>
                            <p className="text-xs text-muted-foreground/60 mt-0.5">Thử thay đổi bộ lọc hoặc thêm phim mới</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Trang {pagination.page}/{pagination.totalPages} — {pagination.total} phim</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchMovies(pagination.page - 1)}>Trước</Button>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchMovies(pagination.page + 1)}>Sau</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
