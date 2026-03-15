'use client'

import { Film, Users, Eye, TrendingUp, ArrowUp, ArrowDown, Play } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

const STATS = [
  {
    title: 'Tổng số phim',
    value: '1,234',
    change: '+12%',
    trend: 'up',
    icon: Film,
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    title: 'Người dùng',
    value: '45,678',
    change: '+8.2%',
    trend: 'up',
    icon: Users,
    color: 'bg-green-500/10 text-green-500',
  },
  {
    title: 'Lượt xem hôm nay',
    value: '12,345',
    change: '+23%',
    trend: 'up',
    icon: Eye,
    color: 'bg-purple-500/10 text-purple-500',
  },
  {
    title: 'Doanh thu tháng',
    value: '234M',
    change: '-2.4%',
    trend: 'down',
    icon: TrendingUp,
    color: 'bg-orange-500/10 text-orange-500',
  },
]

const RECENT_MOVIES = [
  { id: 1, title: 'Tử Chiến Trên Không', views: 12345, status: 'active' },
  { id: 2, title: 'Hoa Máu', views: 9876, status: 'active' },
  { id: 3, title: 'Danh Dự Cuối Cùng', views: 8765, status: 'active' },
  { id: 4, title: 'Bàn Tay Diệt Quỷ', views: 7654, status: 'pending' },
  { id: 5, title: 'Chòm Sao Thiên Hậu', views: 6543, status: 'active' },
]

const TOP_USERS = [
  { id: 1, name: 'Nguyễn Văn A', email: 'a@email.com', watched: 156 },
  { id: 2, name: 'Trần Thị B', email: 'b@email.com', watched: 143 },
  { id: 3, name: 'Lê Văn C', email: 'c@email.com', watched: 128 },
  { id: 4, name: 'Phạm Thị D', email: 'd@email.com', watched: 115 },
  { id: 5, name: 'Hoàng Văn E', email: 'e@email.com', watched: 98 },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <p className="text-muted-foreground">Chào mừng trở lại! Đây là tổng quan hoạt động của bạn.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.title} className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {stat.trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  {stat.change}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
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
              {RECENT_MOVIES.map((movie) => (
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
              {TOP_USERS.map((user, idx) => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-semibold">{user.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                    <div className="text-right">
                    <p className="font-semibold">{user.watched}</p>
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
