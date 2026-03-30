'use client'

// ============================================
// NewsTabs — Tab navigation for /news page
// ============================================

import { Flame, Calendar, Play, Star } from 'lucide-react'
import type { NewsTab } from '@/hooks/useNewsPage'

interface NewsTabsProps {
  activeTab: NewsTab
  onTabChange: (tab: NewsTab) => void
}

const TABS: { key: NewsTab; label: string; icon: React.ReactNode }[] = [
  { key: 'breaking', label: 'Tin nóng', icon: <Flame className="h-3.5 w-3.5" /> },
  { key: 'upcoming', label: 'Sắp ra rạp', icon: <Calendar className="h-3.5 w-3.5" /> },
  { key: 'trailer', label: 'Trailer', icon: <Play className="h-3.5 w-3.5" /> },
  { key: 'review', label: 'Review', icon: <Star className="h-3.5 w-3.5" /> },
]

export function NewsTabs({ activeTab, onTabChange }: NewsTabsProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
      {TABS.map(({ key, label, icon }) => {
        const isActive = activeTab === key
        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`
              inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold
              whitespace-nowrap transition-all duration-200
              ${isActive
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-white/5 text-white/50 border border-white/[0.06] hover:bg-white/10 hover:text-white/70'
              }
            `}
          >
            {icon}
            {label}
          </button>
        )
      })}
    </div>
  )
}
