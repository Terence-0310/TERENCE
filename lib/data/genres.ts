// ============================================
// Genre Data Layer — for mega dropdown and client components
// ============================================
// Static genre list matching TMDB IDs.
// Used by navbar mega dropdown + genre page fallback.

export interface Genre {
  id: number
  name: string
}

export const GENRES: Genre[] = [
  { id: 28, name: 'Hành Động' },
  { id: 12, name: 'Phiêu Lưu' },
  { id: 16, name: 'Hoạt Hình' },
  { id: 35, name: 'Hài' },
  { id: 80, name: 'Hình Sự' },
  { id: 99, name: 'Tài Liệu' },
  { id: 18, name: 'Chính Kịch' },
  { id: 10751, name: 'Gia Đình' },
  { id: 14, name: 'Giả Tưởng' },
  { id: 36, name: 'Lịch Sử' },
  { id: 27, name: 'Kinh Dị' },
  { id: 10402, name: 'Âm Nhạc' },
  { id: 9648, name: 'Bí Ẩn' },
  { id: 10749, name: 'Lãng Mạn' },
  { id: 878, name: 'Khoa Học VT' },
  { id: 53, name: 'Giật Gân' },
  { id: 10752, name: 'Chiến Tranh' },
  { id: 37, name: 'Viễn Tây' },
  { id: 10770, name: 'Truyền Hình' },
]

/** Build browse URL for a genre */
export function genreBrowseUrl(genreId: number): string {
  return `/browse?genre=${genreId}`
}
