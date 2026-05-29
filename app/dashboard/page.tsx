import { Film, Users, Eye, TrendingUp, ArrowUp, ArrowDown, Play, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/fe/components/ui/card'
import Link from 'next/link'
import { AuthService } from '@/src/be/modules/auth'
import { AdminService } from '@/src/be/modules/admin/admin.service'
import { prisma } from '@/src/be/shared/db/prisma'
import { redirect } from 'next/navigation'
import { GlobalStatsChart } from '@/src/fe/components/admin/GlobalStatsChart'

interface StatItem {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'flat'
}

const STAT_ICONS = [Film, Users, Eye, TrendingUp]
const STAT_COLORS = [
  'bg-blue-500/10 text-blue-500',
  'bg-[rgba(45,212,191,0.1)] text-primary',
  'bg-purple-500/10 text-purple-500',
  'bg-orange-500/10 text-orange-500',
]

export default async function DashboardPage() {
  const user = await AuthService.getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    redirect('/login')
  }

  const rawStats = await AdminService.getDashboardSummary()

  // Derive `views vs yesterday` from the 7-day chart so we stop showing a hardcoded "0%".
  // chartData is ordered oldest → newest, so `[-2]` is yesterday and `[-1]` is today.
  const todayViews = rawStats.chartData?.at(-1)?.views ?? 0
  const yesterdayViews = rawStats.chartData?.at(-2)?.views ?? 0
  const viewsDelta = yesterdayViews === 0
    ? null
    : Math.round(((todayViews - yesterdayViews) / yesterdayViews) * 100)

  const viewsChangeLabel =
    viewsDelta === null
      ? 'Chưa có dữ liệu so sánh'
      : `${viewsDelta >= 0 ? '+' : ''}${viewsDelta}% so với hôm qua`
  const viewsTrend: 'up' | 'down' | 'flat' = viewsDelta === null
    ? 'flat'
    : viewsDelta >= 0 ? 'up' : 'down'

  // Revenue: there is no monthly comparison endpoint yet, so we show the
  // 7-day total honestly instead of a fake "+10% vs last month".
  const revenueChangeLabel = rawStats.totalRevenue > 0
    ? 'Tổng 7 ngày qua'
    : 'Chưa có giao dịch'

  const stats: StatItem[] = [
    { title: 'Tổng số phim', value: rawStats.totalMovies.toLocaleString(), change: `+${rawStats.newMovies7d} phim mới tuần này`, trend: 'up' },
    { title: 'Người dùng', value: rawStats.totalUsers.toLocaleString(), change: `+${rawStats.newUsers7d} tuần qua`, trend: 'up' },
    { title: 'Lượt xem hôm nay', value: rawStats.viewsToday.toLocaleString(), change: viewsChangeLabel, trend: viewsTrend },
    { title: 'Doanh thu', value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(rawStats.totalRevenue), change: revenueChangeLabel, trend: rawStats.totalRevenue > 0 ? 'up' : 'flat' },
  ]
  const recentMovies = rawStats.topMovies.map((m) => ({
    id: m.id, title: m.title, views: m.viewCount, status: m.status === 'published' ? 'active' : 'pending'
  }))

  // Fetch real watch counts per recent user instead of hardcoding 0.
  const userIds = rawStats.recentUsers.map((u) => u.id)
  const watchedCounts = userIds.length
    ? await prisma.watchHistory.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds } },
        _count: { _all: true },
      })
    : []
  const watchedByUser = new Map(watchedCounts.map((r) => [r.userId, r._count._all]))

  const topUsers = rawStats.recentUsers.map((u) => ({
    id: u.id, name: u.name, email: u.email, watched: watchedByUser.get(u.id) ?? 0
  }))

  const loading = false
  const data = { recentMovies, topUsers }

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
                    stat.trend === 'up' ? 'text-green-500' : stat.trend === 'down' ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    {stat.trend === 'up' && <ArrowUp className="w-4 h-4 animate-bounce" />}
                    {stat.trend === 'down' && <ArrowDown className="w-4 h-4 animate-bounce" />}
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

      {/* Growth Chart */}
      <GlobalStatsChart data={rawStats.chartData || []} />

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Movies */}
        <Card className="bg-white dark:bg-[#151e2f] border-none shadow-[0_0.25rem_1rem_rgba(0,0,0,0.05)] dark:shadow-none rounded-[1rem] opacity-0 animate-fade-in-up" style={{ animationDelay: '800ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6 px-6">
            <CardTitle className="text-[18px] font-black text-[#25396f] dark:text-white">Phim mới cập nhật</CardTitle>
            <Link href="/dashboard/movies" className="text-sm font-bold text-primary hover:text-primary transition-colors group flex items-center gap-1">
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
                    <div className="w-[50px] h-[50px] rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors group-hover:scale-110 duration-300">
                      <Play className="w-5 h-5 text-primary group-hover:text-[#022c22] transition-colors" />
                    </div>
                    <div>
                      <p className="font-bold text-[#25396f] dark:text-white text-[15px] group-hover:text-primary transition-colors">{movie.title}</p>
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
            <Link href="/dashboard/users" className="text-sm font-bold text-primary hover:text-primary transition-colors group flex items-center gap-1">
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
                    <div className="w-[50px] h-[50px] rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-sm text-[#022c22] group-hover:scale-110 transition-transform duration-300">
                      <span className="font-black text-lg">{u.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-bold text-[#25396f] dark:text-white text-[15px] group-hover:text-primary transition-colors">{u.name}</p>
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
                className="flex flex-col gap-4 p-6 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-primary/5 border border-transparent dark:hover:border-primary/20 transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${1100 + idx * 100}ms`, animationFillMode: 'forwards' }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-300 group-hover:scale-110 group-hover:rotate-3">
                   <action.icon className="w-6 h-6 text-primary group-hover:text-[#022c22] transition-colors" />
                </div>
                <div>
                  <p className="font-bold text-[#25396f] dark:text-white text-[15px] group-hover:text-primary transition-colors">{action.title}</p>
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

