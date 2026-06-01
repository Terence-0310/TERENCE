'use client'

// ============================================
// DashboardLiveStats — realtime admin strip
// ============================================
// Subscribes to the admin dashboard room (DASH_STATS + USERS_ONLINE) and
// shows a live-updating row of today's key metrics. Server-rendered cards
// above stay as the at-load snapshot; this strip reflects realtime deltas.

import { Activity, Users, Coins, TrendingDown, Megaphone, Gift } from 'lucide-react'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'
import { useAdminDashboardRealtime } from '@/src/fe/lib/realtime/hooks'

export function DashboardLiveStats() {
  const { user } = useAuth()
  const { stats, onlineUsers } = useAdminDashboardRealtime(user?.id ?? null)

  const online = onlineUsers ?? stats?.onlineUsers ?? null
  const fmt = (n: number | undefined | null) => (n == null ? '—' : n.toLocaleString('vi-VN'))

  const cells = [
    { icon: Users, label: 'Đang online', value: fmt(online), accent: 'text-emerald-400' },
    { icon: Coins, label: 'TCoin nhận hôm nay', value: fmt(stats?.tcoinEarnedToday), accent: 'text-green-400' },
    { icon: TrendingDown, label: 'TCoin chi hôm nay', value: fmt(stats?.tcoinSpentToday), accent: 'text-red-400' },
    { icon: Megaphone, label: 'Lượt hiển thị QC', value: fmt(stats?.adImpressionsToday), accent: 'text-orange-400' },
    { icon: Gift, label: 'Đổi quà hôm nay', value: fmt(stats?.redeemsToday), accent: 'text-purple-400' },
  ]

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white dark:bg-[#151e2f] shadow-[0_0.25rem_1rem_rgba(0,0,0,0.05)] dark:shadow-none p-4 md:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <Activity className="h-4 w-4 text-emerald-400" />
        {stats == null && online == null && (
          <span className="text-[11px] text-gray-400">đang kết nối…</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cells.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="rounded-xl bg-gray-50 dark:bg-white/[0.03] p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-white/50">
                <Icon className="h-3.5 w-3.5" /> {c.label}
              </div>
              <div className={`mt-1 text-xl font-black tabular-nums ${c.accent}`}>{c.value}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
