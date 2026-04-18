'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, Clock, Search, Film, Video, User, Shield, Upload, LogIn,
  Trash2, Plus, Edit, Eye, EyeOff, RotateCcw, Lock, Unlock,
  Star, TrendingUp, Heart, Archive, ChevronDown, ChevronRight, X,
} from 'lucide-react'
import { Button } from '@/src/fe/components/ui/button'
import { Input } from '@/src/fe/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/fe/components/ui/card'

interface LogItem {
  id: string; action: string; targetType: string | null; targetId: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any> | null; ipAddress: string | null; createdAt: string
  actor: { name: string; email: string; role: string; avatar: string | null }
}

interface Pagination { page: number; limit: number; total: number; totalPages: number }

// ─── Pretty labels ──────────────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  login: 'Đăng nhập', create: 'Tạo mới', update: 'Cập nhật', delete: 'Xóa',
  restore: 'Khôi phục', publish: 'Xuất bản', hide: 'Ẩn', archive: 'Lưu trữ',
  block: 'Khóa', unblock: 'Mở khóa', upload: 'Upload', change_role: 'Đổi quyền',
  reset_password: 'Reset mật khẩu', suspend: 'Đình chỉ',
  toggle_featured: 'Đổi nổi bật', toggle_trending: 'Đổi trending', toggle_recommend: 'Đổi đề xuất',
}

const ACTION_COLORS: Record<string, string> = {
  login: 'text-blue-400', create: 'text-green-400', update: 'text-yellow-400',
  delete: 'text-red-400', restore: 'text-emerald-400', publish: 'text-green-500',
  hide: 'text-orange-400', archive: 'text-gray-400', block: 'text-red-500',
  unblock: 'text-green-500', upload: 'text-cyan-400', reset_password: 'text-amber-400',
  change_role: 'text-purple-400',
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  login: LogIn, create: Plus, update: Edit, delete: Trash2,
  restore: RotateCcw, publish: Eye, hide: EyeOff, archive: Archive,
  block: Lock, unblock: Unlock, upload: Upload, reset_password: Shield,
  change_role: User, toggle_featured: Star, toggle_trending: TrendingUp,
  toggle_recommend: Heart, suspend: Lock,
}

const TARGET_LABELS: Record<string, string> = {
  movie: 'Phim', episode: 'Tập phim', short: 'Short Video',
  user: 'Người dùng', upload: 'Upload', system: 'Hệ thống',
}

const TARGET_ICONS: Record<string, React.ElementType> = {
  movie: Film, episode: Film, short: Video, user: User,
  upload: Upload, system: Shield,
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 30, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [targetTypeFilter, setTargetTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '30' })
    if (search) params.set('search', search)
    if (actionFilter) params.set('action', actionFilter)
    if (targetTypeFilter) params.set('targetType', targetTypeFilter)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    try {
      const res = await fetch(`/api/admin/logs?${params}`)
      const json = await res.json()
      setLogs(json.data || [])
      setPagination(json.pagination || { page: 1, limit: 30, total: 0, totalPages: 0 })
    } catch { setLogs([]) }
    setLoading(false)
  }, [search, actionFilter, targetTypeFilter, dateFrom, dateTo])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const clearFilters = () => {
    setSearch(''); setActionFilter(''); setTargetTypeFilter('')
    setDateFrom(''); setDateTo('')
  }
  const hasFilters = search || actionFilter || targetTypeFilter || dateFrom || dateTo

  // Stats from current page data
  const todayCount = logs.filter(l => {
    const d = new Date(l.createdAt)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Nhật ký quản trị</h1>
          <p className="text-muted-foreground">Theo dõi toàn bộ hoạt động quản trị trên hệ thống</p>
        </div>
        <div className="flex gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
              <X className="w-3 h-3" /> Xóa bộ lọc
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => fetchLogs()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border"><CardContent className="p-4">
          <p className="text-2xl font-bold">{pagination.total.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Tổng log</p>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4">
          <p className="text-2xl font-bold text-blue-400">{todayCount}</p>
          <p className="text-sm text-muted-foreground">Hôm nay</p>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4">
          <p className="text-2xl font-bold text-green-400">{logs.filter(l => l.action === 'create').length}</p>
          <p className="text-sm text-muted-foreground">Tạo mới</p>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4">
          <p className="text-2xl font-bold text-red-400">{logs.filter(l => l.action === 'delete').length}</p>
          <p className="text-sm text-muted-foreground">Xóa</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border"><CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Tìm theo tên, email, metadata..." className="pl-9 bg-muted border-border"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm"
              value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="">Tất cả hành động</option>
              <option value="login">Đăng nhập</option>
              <option value="create">Tạo mới</option>
              <option value="update">Cập nhật</option>
              <option value="delete">Xóa</option>
              <option value="restore">Khôi phục</option>
              <option value="publish">Xuất bản</option>
              <option value="hide">Ẩn</option>
              <option value="archive">Lưu trữ</option>
              <option value="block">Khóa</option>
              <option value="unblock">Mở khóa</option>
              <option value="upload">Upload</option>
              <option value="reset_password">Reset mật khẩu</option>
              <option value="change_role">Đổi quyền</option>
              <option value="toggle_featured">Đổi nổi bật</option>
              <option value="toggle_trending">Đổi trending</option>
            </select>
            <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm"
              value={targetTypeFilter} onChange={(e) => setTargetTypeFilter(e.target.value)}>
              <option value="">Tất cả đối tượng</option>
              <option value="movie">Phim</option>
              <option value="episode">Tập phim</option>
              <option value="short">Short Video</option>
              <option value="user">Người dùng</option>
              <option value="upload">Upload</option>
              <option value="system">Hệ thống</option>
            </select>
            <Input type="date" className="w-auto bg-muted border-border text-sm" placeholder="Từ ngày"
              value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" className="w-auto bg-muted border-border text-sm" placeholder="Đến ngày"
              value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </CardContent></Card>

      {/* Log entries */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Lịch sử hoạt động ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const ActionIcon = ACTION_ICONS[log.action] || Clock
                const TargetIcon = TARGET_ICONS[log.targetType || ''] || Clock
                const actionColor = ACTION_COLORS[log.action] || 'text-muted-foreground'
                const meta = log.metadata
                const isExpanded = expandedId === log.id

                return (
                  <div key={log.id}
                    className="rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-center gap-4 p-4">
                      {/* Action icon */}
                      <div className={`w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0`}>
                        <ActionIcon className={`w-4 h-4 ${actionColor}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-semibold text-primary">{log.actor.name}</span>{' '}
                          <span className={`font-medium ${actionColor}`}>
                            {ACTION_LABELS[log.action] || log.action}
                          </span>{' '}
                          {log.targetType && (
                            <span className="text-muted-foreground inline-flex items-center gap-1">
                              <TargetIcon className="w-3 h-3 inline" />
                              {TARGET_LABELS[log.targetType] || log.targetType}
                            </span>
                          )}
                          {meta?.title && <span className="font-semibold"> &quot;{meta.title}&quot;</span>}
                          {meta?.email && <span className="text-muted-foreground"> ({meta.email})</span>}
                          {meta?.field && <span className="text-muted-foreground"> [{meta.field}]</span>}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>{new Date(log.createdAt).toLocaleString('vi')}</span>
                          {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                          <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{log.actor.role}</span>
                          {log.targetId && <span className="truncate max-w-[120px]">ID: {log.targetId}</span>}
                        </div>
                      </div>

                      {/* Expand indicator */}
                      {meta && Object.keys(meta).length > 0 && (
                        <div className="shrink-0 text-muted-foreground">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      )}
                    </div>

                    {/* Expanded metadata */}
                    {isExpanded && meta && Object.keys(meta).length > 0 && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Chi tiết metadata</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {Object.entries(meta).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="text-muted-foreground font-medium min-w-[80px]">{key}:</span>
                                <span className="text-foreground break-all">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {logs.length === 0 && (
                <p className="text-center text-muted-foreground py-12">
                  {hasFilters ? 'Không tìm thấy log phù hợp' : 'Chưa có log nào'}
                </p>
              )}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Trang {pagination.page}/{pagination.totalPages} — {pagination.total} log
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}>Trước</Button>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLogs(pagination.page + 1)}>Sau</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
