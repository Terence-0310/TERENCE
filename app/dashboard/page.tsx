'use client'

import { useEffect, useState } from 'react'
import { Film, Users, Eye, TrendingUp, ArrowUp, ArrowDown, Play } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface StatItem {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
}

interface MovieItem {
  id: number
  title: string
  views: number
  status: string
}

interface UserItem {
  id: number
  name: string
  email: string
  watched: number
}

interface DashboardData {
  stats: StatItem[]
  recentMovies: MovieItem[]
  topUsers: UserItem[]
}

const STAT_ICONS = [Film, Users, Eye, TrendingUp]
const STAT_COLORS = [
  'bg-blue-500/10 text-blue-500',
  'bg-green-500/10 text-green-500',
  'bg-purple-500/10 text-purple-500',
  'bg-orange-500/10 text-orange-500',
]

// Fallback data used when API is unavailable
const FALLBACK: DashboardData = {
  stats: [
    { title: 'Tổng số phim', value: '—', change: '—', trend: 'up' },
    { title: 'Người dùng', value: '—', change: '—', trend: 'up' },
    { title: 'Lượt xem hôm nay', value: '—', change: '—', trend: 'up' },
    { title: 'Doanh thu tháng', value: '—', change: '—', trend: 'up' },
  ],
  recentMovies: [],
  topUsers: [],
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(FALLBACK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/summary')
      .then((res) => {
        if (!res.ok) throw new Error('Failed')
        return res.json()
      })
      .then((d: DashboardData) => setData(d))
      .catch(() => setData(FALLBACK))
      .finally(() => setLoading(false))
  }, [])

  const stats = data.stats

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <p className="text-muted-foreground">Chào mừng trở lại! Đây là tổng quan hoạt động của bạn.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = STAT_ICONS[idx] || Film
          const color = STAT_COLORS[idx] || STAT_COLORS[0]
          return (
            <Card key={stat.title} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${
                    stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {stat.trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    {stat.change}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">{loading ? '...' : stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Movies */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Phim mới cập nhật</CardTitle>
            <Link href="/dashboard/movies" className="text-sm text-primary hover:underline">
              Xem tat ca
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentMovies.length === 0 && !loading && (
                <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
              )}
              {data.recentMovies.map((movie) => (
                <div key={movie.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Play className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{movie.title}</p>
                      <p className="text-xs text-muted-foreground">{movie.views.toLocaleString()} lượt xem</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    movie.status === 'active' 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {movie.status === 'active' ? 'Đang chiếu' : 'Chờ duyệt'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Người dùng tích cực</CardTitle>
            <Link href="/dashboard/users" className="text-sm text-primary hover:underline">
              Xem tat ca
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topUsers.length === 0 && !loading && (
                <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
              )}
              {data.topUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-semibold">{u.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                    <div className="text-right">
                    <p className="font-semibold">{u.watched}</p>
                    <p className="text-xs text-muted-foreground">phim đã xem</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Thao tác nhanh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/dashboard/movies"
              className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <Film className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">Thêm phim mới</p>
                <p className="text-xs text-muted-foreground">Upload nội dung mới</p>
              </div>
            </Link>
            <Link
              href="/dashboard/users"
              className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">Quản lý user</p>
                <p className="text-xs text-muted-foreground">Xem và chỉnh sửa</p>
              </div>
            </Link>
            <Link
              href="/dashboard/analytics"
              className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <TrendingUp className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">Xem báo cáo</p>
                <p className="text-xs text-muted-foreground">Thống kê chi tiết</p>
              </div>
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <Eye className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">Cài đặt hệ thống</p>
                <p className="text-xs text-muted-foreground">Tùy chỉnh cấu hình</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
