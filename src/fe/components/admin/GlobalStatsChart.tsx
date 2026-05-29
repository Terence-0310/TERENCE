'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/src/fe/components/ui/card'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'
import { useState } from 'react'

export function GlobalStatsChart({ data = [] }: { data?: any[] }) {
  const [tab, setTab] = useState<'views' | 'revenue'>('views')

  return (
    <Card className="bg-white dark:bg-[#151e2f] border-none shadow-[0_0.25rem_1rem_rgba(0,0,0,0.05)] dark:shadow-none rounded-[1rem] col-span-1 lg:col-span-2 opacity-0 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
      <CardHeader className="flex flex-row items-center justify-between pb-6 pt-6 px-6">
        <div>
          <CardTitle className="text-[18px] font-black text-[#25396f] dark:text-white mb-1">
            Biểu đồ tăng trưởng
          </CardTitle>
          <p className="text-[13px] text-gray-500 font-medium">
            Thống kê {tab === 'views' ? 'lượt truy cập' : 'doanh thu'} trong 7 ngày qua
          </p>
        </div>
        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
          <button
            onClick={() => setTab('views')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              tab === 'views' 
                ? 'bg-white dark:bg-[#25396f] text-primary dark:text-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Lượt xem
          </button>
          <button
            onClick={() => setTab('revenue')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              tab === 'revenue' 
                ? 'bg-white dark:bg-[#25396f] text-primary dark:text-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Doanh thu
          </button>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-8 h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          {tab === 'views' ? (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary, #0ea5e9)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-primary, #0ea5e9)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-200 dark:text-white/10" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888888' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888888' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', backgroundColor: 'var(--bg-card, #ffffff)' }}
                itemStyle={{ color: 'var(--color-primary, #0ea5e9)', fontWeight: 'bold' }}
                cursor={{ stroke: 'var(--color-primary, #0ea5e9)', strokeWidth: 1, strokeDasharray: '5 5' }}
              />
              <Area 
                type="monotone" 
                dataKey="views" 
                name="Lượt xem"
                stroke="var(--color-primary, #0ea5e9)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorViews)" 
                animationDuration={1500}
              />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-200 dark:text-white/10" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888888' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888888' }} tickFormatter={(val) => `đ${val / 1000}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', backgroundColor: 'var(--bg-card, #ffffff)' }}
                itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                cursor={{ fill: 'currentColor', className: 'text-gray-100 dark:text-white/5' }}
              />
              <Bar 
                dataKey="revenue" 
                name="Doanh thu"
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
