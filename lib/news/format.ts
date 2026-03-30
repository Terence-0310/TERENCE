// ============================================
// News Module — Display Helpers
// ============================================
// Shared formatting functions for news/upcoming UI.
// Extracted to avoid duplication across components.

/**
 * Format a date string as relative time in Vietnamese.
 * "Vừa xong", "3 giờ trước", "Hôm qua", "5 ngày trước", etc.
 */
export function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 0) return formatAbsoluteDate(dateStr)
    if (diffHours < 1) return 'Vừa xong'
    if (diffHours < 24) return `${diffHours} giờ trước`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Hôm qua'
    if (diffDays < 7) return `${diffDays} ngày trước`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`

    return formatAbsoluteDate(dateStr)
  } catch {
    return dateStr
  }
}

/**
 * Format an absolute date in Vietnamese locale.
 * "25 thg 3, 2026"
 */
export function formatAbsoluteDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/**
 * Format release date as relative countdown or past date.
 * "3 ngày nữa", "2 tuần nữa", "Đã ra rạp", "25 thg 6, 2026"
 */
export function formatReleaseDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return 'Đã ra rạp'
    if (diffDays === 1) return 'Ngày mai'
    if (diffDays <= 7) return `${diffDays} ngày nữa`
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} tuần nữa`
    if (diffDays <= 90) return `${Math.ceil(diffDays / 30)} tháng nữa`

    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/**
 * Truncate text to a max length with ellipsis, breaking at word boundary.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > maxLength * 0.6 ? truncated.slice(0, lastSpace) : truncated) + '…'
}
