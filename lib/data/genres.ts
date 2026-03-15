// ============================================
// Genre Data Layer — for mega dropdown and client components
// ============================================
// Static genre list matching TMDB IDs.
// Used by navbar mega dropdown + genre page fallback.

export interface Genre {
  id: number
  name: string
  icon: string
}

export const GENRES: Genre[] = [
  { id: 28, name: 'Hành Động', icon: '⚔️' },
  { id: 12, name: 'Phiêu Lưu', icon: '🗺️' },
  { id: 16, name: 'Hoạt Hình', icon: '🎨' },
  { id: 35, name: 'Hài', icon: '😂' },
  { id: 80, name: 'Hình Sự', icon: '🔫' },
  { id: 99, name: 'Tài Liệu', icon: '📹' },
  { id: 18, name: 'Chính Kịch', icon: '🎭' },
  { id: 10751, name: 'Gia Đình', icon: '👨‍👩‍👧‍👦' },
  { id: 14, name: 'Giả Tưởng', icon: '🧙' },
  { id: 36, name: 'Lịch Sử', icon: '📜' },
  { id: 27, name: 'Kinh Dị', icon: '👻' },
  { id: 10402, name: 'Âm Nhạc', icon: '🎵' },
  { id: 9648, name: 'Bí Ẩn', icon: '🔍' },
  { id: 10749, name: 'Lãng Mạn', icon: '💕' },
  { id: 878, name: 'Khoa Học VT', icon: '🚀' },
  { id: 53, name: 'Giật Gân', icon: '😱' },
  { id: 10752, name: 'Chiến Tranh', icon: '🎖️' },
  { id: 37, name: 'Viễn Tây', icon: '🤠' },
  { id: 10770, name: 'Truyền Hình', icon: '📺' },
]

/** Build browse URL for a genre */
export function genreBrowseUrl(genreId: number): string {
  return `/browse?genre=${genreId}`
}
