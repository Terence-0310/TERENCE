'use client'

// ============================================
// NewsEmptyState — Empty / error UI
// ============================================

import { Newspaper, Search, AlertCircle } from 'lucide-react'

interface NewsEmptyStateProps {
  type?: 'empty' | 'search' | 'error'
  message?: string
  /** Search query that produced no results */
  query?: string
}

export function NewsEmptyState({ type = 'empty', message, query }: NewsEmptyStateProps) {
  const configs = {
    empty: {
      icon: <Newspaper className="h-12 w-12 text-white/[0.08]" />,
      title: 'Chưa có tin tức',
      description: message || 'Vui lòng thử lại sau hoặc chọn danh mục khác.',
    },
    search: {
      icon: <Search className="h-12 w-12 text-white/[0.08]" />,
      title: query ? `Không tìm thấy kết quả cho "${query}"` : 'Không tìm thấy kết quả',
      description: message || 'Thử dùng từ khóa khác hoặc tên tiếng Anh của phim.',
    },
    error: {
      icon: <AlertCircle className="h-12 w-12 text-red-400/20" />,
      title: 'Chưa tải được tin tức',
      description: message || 'Hiện chưa có dữ liệu phù hợp. Vui lòng thử lại sau.',
    },
  }

  const config = configs[type]

  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center text-center py-12">
      <div className="mb-4">{config.icon}</div>
      <p className="text-white/50 text-sm font-medium">{config.title}</p>
      <p className="text-white/25 text-xs mt-1.5 max-w-sm">{config.description}</p>
    </div>
  )
}
