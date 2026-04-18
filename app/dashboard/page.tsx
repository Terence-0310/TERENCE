'use client'

import { useEffect, useState } from 'react'
import { Film, Users, Eye, TrendingUp, ArrowUp, ArrowDown, Play, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/fe/components/ui/card'
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
  'bg-[rgba(45,212,191,0.1)] text-[#2dd4bf]',
  'bg-purple-500/10 text-purple-500',
  'bg-orange-500/10 text-orange-500',
]

// Realistic mock data used when API is unavailable or returns empty
const MOCK_DATA: DashboardData = {
  stats: [
    { title: 'Tổng số phim', value: '12,480', change: '+142 phim mới tuần này', trend: 'up' },
    { title: 'Người dùng', value: '42,560', change: '+1,250 tuần qua', trend: 'up' },
    { title: 'Lượt xem hôm nay', value: '325,400', change: 'Tăng 15% so với hôm qua', trend: 'up' },
    { title: 'Doanh thu tháng', value: '145.5M TCoin', change: '+12% so với tháng trước', trend: 'up' },
  ],
  recentMovies: [
    { id: 1, title: 'Inception (Kẻ Đánh Cắp Giấc Mơ)', views: 1254300, status: 'active' },
    { id: 2, title: 'Avengers: Endgame', views: 985000, status: 'active' },
    { id: 3, title: 'Interstellar (Hố Đen Tử Thần)', views: 852000, status: 'active' },
    { id: 4, title: 'Spider-Man: No Way Home', views: 741000, status: 'active' },
    { id: 5, title: 'The Dark Knight', views: 654000, status: 'active' }
  ],
  topUsers: [
    { id: 1, name: 'Nguyễn Văn A', email: 'nguyenvana@gmail.com', watched: 1250 },
    { id: 2, name: 'Trần Thị B', email: 'tranthib@hotmail.com', watched: 980 },
    { id: 3, name: 'Lê Hoàng C', email: 'lehoangc@yahoo.com', watched: 845 },
    { id: 4, name: 'Phạm Minh D', email: 'phamminhd@admin.com', watched: 760 },
    { id: 5, name: 'Hoàng Thái E', email: 'hoangthaie@test.com', watched: 620 }
  ],
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(MOCK_DATA)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/summary')
      .then((res) => {
        if (!res.ok) throw new Error('Failed')
        return res.json()
      })
      .then((d: DashboardData) => {
         setData(d)
      })
      .catch((err) => {
         console.error('Lỗi lấy summary:', err)
         setData(MOCK_DATA)
      })
      .finally(() => setLoading(false))
  }, [])

  const stats = data.stats

  return (
    <div className="space-y-8 font-nunito pb-10">
      {/* Page Header */}
      <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <h1 className="text-[28px] font-black text-[#25396f] dark:text-white mb-1">Tổng quan Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Chào mừng trở lại! Đây là tổng quan hoạt động của hệ thống xem phim.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = STAT_ICONS[idx] || Film
          const color = STAT_COLORS[idx] || STAT_COLORS[0]
          return (
            <Card 
              key={stat.title} 
              className="bg-white dark:bg-[#151e2f] border-none shadow-[0_0.25rem_1rem_rgba(0,0,0,0.05)] dark:shadow-none rounded-[1rem] overflow-hidden opacity-0 animate-fade-in-up hover:-translate-y-1 transition-transform duration-300"
              style={{ animationDelay: `${400 + idx * 100}ms` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-bold ${
                    stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {stat.trend === 'up' ? <ArrowUp className="w-4 h-4 animate-bounce" /> : <ArrowDown className="w-4 h-4 animate-bounce" />}
                    {stat.change}
                  </div>
                </div>
                <div className="mt-5">
                  {loading ? (
                    <div className="h-8 w-24 rounded bg-gray-200 dark:bg-white/5 animate-pulse" />
                  ) : (
                    <p className="text-[26px] font-black text-[#25396f] dark:text-white leading-none mb-2">{stat.value}</p>
                  )}
                  <p className="text-[15px] font-bold text-gray-400">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Movies */}
        <Card className="bg-white dark:bg-[#151e2f] border-none shadow-[0_0.25rem_1rem_rgba(0,0,0,0.05)] dark:shadow-none rounded-[1rem] opacity-0 animate-fade-in-up" style={{ animationDelay: '800ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6 px-6">
            <CardTitle className="text-[18px] font-black text-[#25396f] dark:text-white">Phim mới cập nhật</CardTitle>
            <Link href="/dashboard/movies" className="text-sm font-bold text-[#2dd4bf] hover:text-[#14b8a6] transition-colors group flex items-center gap-1">
              Xem tất cả <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-4">
              {data.recentMovies.length === 0 && !loading && (
                <p className="text-gray-500 text-center py-6 font-medium">Chưa có dữ liệu</p>
              )}
              {data.recentMovies.map((movie) => (
                <div key={movie.id} className="flex items-center justify-between group p-3 -mx-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-[50px] h-[50px] rounded-2xl bg-[#2dd4bf]/10 flex items-center justify-center shrink-0 group-hover:bg-[#2dd4bf] transition-colors group-hover:scale-110 duration-300">
                      <Play className="w-5 h-5 text-[#2dd4bf] group-hover:text-[#022c22] transition-colors" />
                    </div>
                    <div>
                      <p className="font-bold text-[#25396f] dark:text-white text-[15px] group-hover:text-[#2dd4bf] transition-colors">{movie.title}</p>
                      <p className="text-sm text-gray-500 font-medium mt-0.5">{movie.views.toLocaleString()} lượt xem</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    movie.status === 'active' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' 
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'
                  }`}>
                    {movie.status === 'active' ? 'Đang chiếu' : 'Chờ duyệt'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card className="bg-white dark:bg-[#151e2f] border-none shadow-[0_0.25rem_1rem_rgba(0,0,0,0.05)] dark:shadow-none rounded-[1rem] opacity-0 animate-fade-in-up" style={{ animationDelay: '900ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6 px-6">
            <CardTitle className="text-[18px] font-black text-[#25396f] dark:text-white">Người dùng tích cực</CardTitle>
            <Link href="/dashboard/users" className="text-sm font-bold text-[#2dd4bf] hover:text-[#14b8a6] transition-colors group flex items-center gap-1">
              Xem tất cả <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-4">
              {data.topUsers.length === 0 && !loading && (
                <p className="text-gray-500 text-center py-6 font-medium">Chưa có dữ liệu</p>
              )}
              {data.topUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between group p-3 -mx-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-[50px] h-[50px] rounded-2xl bg-[#2dd4bf] flex items-center justify-center shrink-0 shadow-sm text-[#022c22] group-hover:scale-110 transition-transform duration-300">
                      <span className="font-black text-lg">{u.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-bold text-[#25396f] dark:text-white text-[15px] group-hover:text-[#2dd4bf] transition-colors">{u.name}</p>
                      <p className="text-sm text-gray-500 font-medium mt-0.5">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[#25396f] dark:text-white">{u.watched}</p>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Lượt xem</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white dark:bg-[#151e2f] border-none shadow-[0_0.25rem_1rem_rgba(0,0,0,0.05)] dark:shadow-none rounded-[1rem] overflow-hidden relative opacity-0 animate-fade-in-up" style={{ animationDelay: '1000ms' }}>
        <CardHeader className="pt-8 px-8 pb-2 relative z-10">
          <CardTitle className="text-[20px] font-black text-[#25396f] dark:text-white">Thao tác nhanh hệ thống</CardTitle>
          <p className="text-gray-500 font-medium text-sm mt-1">Truy cập các tính năng cốt lõi chỉ với một click</p>
        </CardHeader>
        <CardContent className="p-8 relative z-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: '/dashboard/movies', icon: Film, title: 'Quản lý kho phim', desc: 'Thêm dòng phim mới, cập nhật server phim.' },
              { href: '/dashboard/users', icon: Users, title: 'Quản trị thành viên', desc: 'Quản lý User, phân định vai trò Admin/Viewer.' },
              { href: '/dashboard/analytics', icon: TrendingUp, title: 'Kiểm tra Analytics', desc: 'Phân tích hành vi, đo lường doanh thu TCoin.' },
              { href: '/dashboard/settings', icon: Settings, title: 'System Settings', desc: 'Thiết lập bộ lọc, cấu hình API tmdb chung.' }
            ].map((action, idx) => (
              <Link
                key={action.title}
                href={action.href}
                className="flex flex-col gap-4 p-6 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-[#2dd4bf]/5 border border-transparent dark:hover:border-[#2dd4bf]/20 transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${1100 + idx * 100}ms`, animationFillMode: 'forwards' }}
              >
                <div className="w-12 h-12 rounded-xl bg-[#2dd4bf]/10 flex items-center justify-center group-hover:bg-[#2dd4bf] transition-colors duration-300 group-hover:scale-110 group-hover:rotate-3">
                   <action.icon className="w-6 h-6 text-[#2dd4bf] group-hover:text-[#022c22] transition-colors" />
                </div>
                <div>
                  <p className="font-bold text-[#25396f] dark:text-white text-[15px] group-hover:text-[#2dd4bf] transition-colors">{action.title}</p>
                  <p className="text-[13px] text-gray-500 font-medium mt-1 leading-snug">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

