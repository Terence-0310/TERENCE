'use client'

import { TrendingUp, TrendingDown, Users, Eye, Film, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const DAILY_VIEWS = [
  { day: 'T2', views: 4500 },
  { day: 'T3', views: 5200 },
  { day: 'T4', views: 4800 },
  { day: 'T5', views: 6100 },
  { day: 'T6', views: 7200 },
  { day: 'T7', views: 8500 },
  { day: 'CN', views: 9200 },
]

const TOP_MOVIES = [
  { title: 'Tu Chien Tren Khong', views: 45678, percentage: 85 },
  { title: 'Hoa Mau', views: 38765, percentage: 72 },
  { title: 'Danh Du Cuoi Cung', views: 32456, percentage: 60 },
  { title: 'Ban Tay Diet Quy', views: 28765, percentage: 53 },
  { title: 'Chom Sao Thien Hau', views: 24567, percentage: 45 },
]

const GENRE_STATS = [
  { name: 'Hanh dong', value: 35, color: 'bg-blue-500' },
  { name: 'Tam ly', value: 25, color: 'bg-purple-500' },
  { name: 'Lang man', value: 20, color: 'bg-pink-500' },
  { name: 'Kinh di', value: 12, color: 'bg-red-500' },
  { name: 'Hai', value: 8, color: 'bg-green-500' },
]

export default function AnalyticsPage() {
  const maxViews = Math.max(...DAILY_VIEWS.map(d => d.views))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Thống kê</h1>
        <p className="text-muted-foreground">Theo dõi hiệu suất và xu hướng của hệ thống</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex items-center gap-1 text-green-500 text-sm">
                <TrendingUp className="w-4 h-4" />
                +23%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">1.2M</p>
              <p className="text-sm text-muted-foreground">Tổng lượt xem tháng</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex items-center gap-1 text-green-500 text-sm">
                <TrendingUp className="w-4 h-4" />
                +12%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">45,678</p>
              <p className="text-sm text-muted-foreground">Người dùng hoạt động</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Film className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex items-center gap-1 text-green-500 text-sm">
                <TrendingUp className="w-4 h-4" />
                +8%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">1,234</p>
              <p className="text-sm text-muted-foreground">Tổng số phim</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <DollarSign className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex items-center gap-1 text-red-500 text-sm">
                <TrendingDown className="w-4 h-4" />
                -2.4%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">234M</p>
              <p className="text-sm text-muted-foreground">Doanh thu tháng</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Views Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Lượt xem theo ngày</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between h-48 gap-2">
              {DAILY_VIEWS.map((day) => (
                <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-primary/80 rounded-t-lg transition-all hover:bg-primary"
                    style={{ height: `${(day.views / maxViews) * 100}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{day.day}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tuần này</span>
              <span className="font-medium text-green-500">+15% so với tuần trước</span>
            </div>
          </CardContent>
        </Card>

        {/* Genre Distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Phân bố thể loại</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {GENRE_STATS.map((genre) => (
                <div key={genre.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{genre.name}</span>
                    <span className="font-medium">{genre.value}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${genre.color} rounded-full transition-all`}
                      style={{ width: `${genre.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Movies */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Phim xem nhiều nhất</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {TOP_MOVIES.map((movie, idx) => (
              <div key={movie.title} className="flex items-center gap-4">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{movie.title}</span>
                    <span className="text-sm text-muted-foreground">{movie.views.toLocaleString()} lượt xem</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${movie.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
