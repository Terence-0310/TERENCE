'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Film, Users, Eye, Video, AlertTriangle,
  RefreshCw, ChevronDown, ChevronRight, Database, Upload,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/fe/components/ui/card'
import { Button } from '@/src/fe/components/ui/button'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OverviewData = Record<string, any>

interface Warning {
  type: string; count: number; label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items?: any[]
}

interface ReportData {
  warnings: Warning[]
  summary: { unpublishedMovies: number; archivedMovies: number; totalActive: number; totalUploads: number }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentlyUpdatedMovies: any[]
}

const EMPTY_OVERVIEW: OverviewData = {
  totalMovies: 0, totalSingleMovies: 0, totalSeries: 0, totalAnime: 0,
  totalUsers: 0, totalAdmins: 0, totalEpisodes: 0,
  newUsers7d: 0, viewsToday: 0, views7d: 0, newMovies7d: 0,
  draftMovies: 0, publishedMovies: 0, hiddenMovies: 0, archivedMovies: 0,
  brokenSources: 0, blockedUsers: 0, missingPoster: 0,
  totalMovieViews: 0, totalShorts: 0, publishedShorts: 0, draftShorts: 0,
}

const EMPTY_REPORTS: ReportData = {
  summary: { unpublishedMovies: 0, archivedMovies: 0, totalActive: 0, totalUploads: 0 },
  warnings: [],
  recentlyUpdatedMovies: []
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(EMPTY_OVERVIEW)
  const [reports, setReports] = useState<ReportData | null>(EMPTY_REPORTS)
  const [loading, setLoading] = useState(true)
  const [expandedWarning, setExpandedWarning] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryRes, reportsRes] = await Promise.all([
        fetch('/api/admin/summary'),
        fetch('/api/admin/reports'),
      ])
      if (summaryRes.ok) {
        const sRaw = await summaryRes.json()
        const s = sRaw.success ? sRaw.data : sRaw
        if (s.overview && typeof s.overview.totalMovies === 'number') {
           setOverview(s.overview)
        } else {
           setOverview(EMPTY_OVERVIEW)
        }
      } else { setOverview(EMPTY_OVERVIEW) }
      if (reportsRes.ok) {
        const rRaw = await reportsRes.json()
        const r = rRaw.success ? rRaw.data : rRaw
        if (r && r.summary && typeof r.summary.totalActive === 'number') {
           setReports(r)
        } else {
           setReports(EMPTY_REPORTS)
        }
      } else { setReports(EMPTY_REPORTS) }
    } catch {
       setOverview(EMPTY_OVERVIEW)
       setReports(EMPTY_REPORTS)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const o = overview || {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Thống kê</h1>
          <p className="text-muted-foreground">Theo dõi hiệu suất và sức khỏe hệ thống</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Film} color="blue" label="Tổng phim" value={o.totalMovies || 0}
              sub={`${o.totalSingleMovies || 0} phim lẻ · ${o.totalSeries || 0} bộ · ${o.totalAnime || 0} anime`} />
            <StatCard icon={Users} color="green" label="Người dùng" value={o.totalUsers || 0}
              sub={`${o.totalAdmins || 0} admin · +${o.newUsers7d || 0} tuần`} />
            <StatCard icon={Video} color="purple" label="Short Video" value={o.totalShorts || 0}
              sub={`${o.publishedShorts || 0} xuất bản · ${o.draftShorts || 0} nháp`} />
            <StatCard icon={Eye} color="orange" label="Lượt xem" value={o.totalMovieViews || 0}
              sub={`Hôm nay: ${o.viewsToday || 0} · 7 ngày: ${o.views7d || 0}`} />
          </div>

          {/* Movie status breakdown */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <MiniCard label="Đã xuất bản" value={o.publishedMovies || 0} color="text-green-400" />
            <MiniCard label="Nháp" value={o.draftMovies || 0} color="text-yellow-400" />
            <MiniCard label="Đã ẩn" value={o.hiddenMovies || 0} color="text-red-400" />
            <MiniCard label="Lưu trữ" value={o.archivedMovies || 0} color="text-gray-400" />
            <MiniCard label="Tổng tập" value={o.totalEpisodes || 0} color="text-cyan-400" />
          </div>

          {/* Content Health Warnings */}
          {reports && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Kiểm tra sức khỏe nội dung
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reports.warnings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Không có cảnh báo nào. Hệ thống hoạt động tốt!</p>
                ) : (
                  <div className="space-y-2">
                    {reports.warnings.map((w) => (
                      <div key={w.type} className="rounded-lg bg-muted/50">
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted transition-colors rounded-lg"
                          onClick={() => setExpandedWarning(expandedWarning === w.type ? null : w.type)}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-2xl font-bold ${w.count > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                              {w.count}
                            </span>
                            <span className="font-medium">{w.label}</span>
                          </div>
                          {w.items && w.items.length > 0 && (
                            expandedWarning === w.type
                              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        {expandedWarning === w.type && w.items && w.items.length > 0 && (
                          <div className="px-4 pb-3 space-y-1">
                            {w.items.slice(0, 10).map((item, i) => (
                              <div key={i} className="text-sm text-muted-foreground pl-10">
                                • {item.title || item.slug || JSON.stringify(item)}
                              </div>
                            ))}
                            {w.items.length > 10 && (
                              <div className="text-xs text-muted-foreground pl-10">
                                ... và {w.items.length - 10} mục khác
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* System Info */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="w-4 h-4" /> Tổng quan hệ thống
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <InfoRow label="Phim chưa xuất bản" value={reports?.summary.unpublishedMovies || 0} />
                  <InfoRow label="Phim đã lưu trữ" value={reports?.summary.archivedMovies || 0} />
                  <InfoRow label="Phim đang hoạt động" value={reports?.summary.totalActive || 0} />
                  <InfoRow label="Tổng file upload" value={reports?.summary.totalUploads || 0} />
                  <InfoRow label="Nguồn lỗi" value={o.brokenSources || 0} />
                  <InfoRow label="User bị khóa" value={o.blockedUsers || 0} />
                  <InfoRow label="Phim thiếu poster" value={o.missingPoster || 0} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Phim mới cập nhật
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(reports?.recentlyUpdatedMovies || []).slice(0, 5).map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                      <span className="font-medium truncate max-w-[200px]">{m.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(m.updatedAt).toLocaleDateString('vi')}
                      </span>
                    </div>
                  ))}
                  {(!reports?.recentlyUpdatedMovies || reports.recentlyUpdatedMovies.length === 0) && (
                    <p className="text-muted-foreground text-sm text-center py-4">Chưa có dữ liệu</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Helper components ──────────────────────────────────────────

function StatCard({ icon: Icon, color, label, value, sub }: {
  icon: React.ElementType; color: string; label: string; value: number; sub: string
}) {
  const colorClass = `bg-${color}-500/10 text-${color}-500`
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${colorClass}`}><Icon className="w-5 h-5" /></div>
          <div>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{sub}</p>
      </CardContent>
    </Card>
  )
}

function MiniCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 text-center">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${value > 0 ? 'text-amber-400' : 'text-green-400'}`}>{value}</span>
    </div>
  )
}
