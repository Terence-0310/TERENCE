'use client'

// ============================================
// DashboardTopMovies — realtime Top View stats table (admin)
// ============================================
// Ranks the most-viewed movies and shows, per movie:
//   • Tổng lượt xem  — cumulative viewCount (ticks up live on each real watch)
//   • Hôm nay        — views tracked today
//   • Đang xem       — live concurrent viewers (socket presence)
// Driven by the admin dashboard snapshot (DASH_STATS, every ~12s + on presence
// changes) plus instant MOVIE_VIEWCOUNT bumps. See useAdminDashboardRealtime.

import Link from 'next/link'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'
import { useAdminDashboardRealtime } from '@/src/fe/lib/realtime/hooks'

function fmt(n: number): string {
  return (n ?? 0).toLocaleString('vi-VN')
}

export function DashboardTopMovies() {
  const { user } = useAuth()
  const { topMovies } = useAdminDashboardRealtime(user?.id ?? null)

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white dark:bg-[#151e2f] shadow-[0_0.25rem_1rem_rgba(0,0,0,0.05)] dark:shadow-none p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-black text-[#25396f] dark:text-white">Thống kê Top View</h3>
          <p className="mt-0.5 text-xs font-medium text-gray-400">Xếp theo người đang xem &amp; lượt xem hôm nay</p>
        </div>
        <Link href="/top-view" className="text-sm font-bold text-primary hover:text-primary transition-colors">
          Xem bảng xếp hạng →
        </Link>
      </div>

      {topMovies.length === 0 ? (
        <p className="py-8 text-center text-sm font-medium text-gray-400">Đang tải dữ liệu realtime…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <th className="pb-3 pl-1 pr-2">#</th>
                <th className="pb-3 pr-2">Phim</th>
                <th className="pb-3 px-2 text-right">Đang xem</th>
                <th className="pb-3 px-2 text-right">Hôm nay</th>
                <th className="pb-3 pl-2 pr-1 text-right">Tổng lượt xem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
              {topMovies.map((m, i) => (
                <tr key={m.id} className="group transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                  <td className="py-3 pl-1 pr-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black ${
                        i === 0
                          ? 'bg-yellow-400/20 text-yellow-500'
                          : i === 1
                          ? 'bg-slate-300/20 text-slate-400'
                          : i === 2
                          ? 'bg-orange-400/20 text-orange-500'
                          : 'bg-gray-100 text-gray-400 dark:bg-white/5'
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-3 pr-2">
                    <div className="flex items-center gap-3">
                      {m.posterUrl || m.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.posterUrl || m.thumbUrl || ''}
                          alt={m.title}
                          className="h-12 w-9 shrink-0 rounded-md object-cover bg-gray-100 dark:bg-white/5"
                        />
                      ) : (
                        <span className="h-12 w-9 shrink-0 rounded-md bg-gray-100 dark:bg-white/5" />
                      )}
                      <span className="line-clamp-2 max-w-[220px] text-sm font-bold text-[#25396f] dark:text-white">
                        {m.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right">
                    {m.liveViewers > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-bold tabular-nums text-red-400">
                        {fmt(m.liveViewers)}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-gray-300 dark:text-white/20">—</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <span className="font-bold tabular-nums text-emerald-500">+{fmt(m.viewsToday)}</span>
                  </td>
                  <td className="py-3 pl-2 pr-1 text-right">
                    <span className="font-black tabular-nums text-[#25396f] dark:text-white">{fmt(m.viewCount)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
