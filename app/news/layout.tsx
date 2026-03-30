// ============================================
// News Page Layout — SEO metadata for /news
// ============================================
// Separates metadata (server) from the client page component.

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tin tức điện ảnh | TERENCE',
  description:
    'Cập nhật tin nóng điện ảnh, trailer mới, review phim và danh sách phim sắp ra rạp trên TERENCE.',
  openGraph: {
    title: 'Tin tức điện ảnh | TERENCE',
    description:
      'Theo dõi tin tức phim mới nhất — box office, trailer, review, lịch chiếu và nhiều hơn nữa.',
    type: 'website',
  },
  keywords: [
    'tin tức phim',
    'movie news',
    'trailer phim',
    'review phim',
    'phim sắp ra rạp',
    'upcoming movies',
    'điện ảnh',
    'TERENCE',
  ],
}

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
