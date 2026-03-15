// ============================================
// News Data Layer — movie industry news
// ============================================
// Curated news content. Replace with CMS/API when ready.

export interface NewsItem {
  id: string
  title: string
  excerpt: string
  date: string
  image: string
  href?: string
  category?: 'box-office' | 'review' | 'industry' | 'casting'
}

const NEWS_DATA: NewsItem[] = [
  {
    id: 'hamnet',
    title: '"Hamnet" trở lại ngôi đầu bảng tại box office Anh & Ireland – khi phim arthouse tỏa sáng',
    excerpt:
      'Phim Hamnet của Chloé Zhao đã tái chiếm vị trí số 1 tại phòng vé Anh & Ireland, vượt qua nhiều bom tấn và những tác phẩm thương mại lớn...',
    date: '3 tháng 3, 2026',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80',
    category: 'box-office',
  },
  {
    id: 'cong-anh-ma-chay',
    title: '[Review Phim] Cõng Anh Mà Chạy – Khi tình yêu vượt qua cả thời gian và định mệnh',
    excerpt:
      'Đây là một hành trình cảm xúc về ký ức, mất mát và tình yêu bền bỉ, nơi một cô gái quay ngược thời gian chỉ để cứu người mình yêu...',
    date: '3 tháng 3, 2026',
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&q=80',
    category: 'review',
  },
  {
    id: 'look-back',
    title: '[Review Phim] Look Back – Một bộ phim không hét lên, nhưng khiến người ta im lặng rất lâu',
    excerpt:
      'Look Back không cố làm bạn xúc động. Nó chỉ nhẹ nhàng đặt trước mặt bạn những ký ức, những lần bỏ lỡ và những câu hỏi về đam mê...',
    date: '2 tháng 3, 2026',
    image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&q=80',
    category: 'review',
  },
  {
    id: 'spiderman-4',
    title: 'Sam Raimi không loại trừ khả năng làm Spider-Man 4 với Tobey Maguire',
    excerpt:
      'Đạo diễn Sam Raimi cho biết ông vẫn cởi mở với ý tưởng làm một phần thứ tư trong loạt phim với Tobey Maguire trở lại vai Peter Parker...',
    date: '1 tháng 3, 2026',
    image: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=1200&q=80',
    category: 'casting',
  },
  {
    id: 'dune-3-release',
    title: 'Dune Part 3 chính thức ấn định ngày khởi chiếu – Denis Villeneuve tham gia đạo diễn',
    excerpt:
      'Warner Bros. xác nhận Dune Part 3 sẽ ra mắt vào cuối năm 2027. Denis Villeneuve tiếp tục ngồi ghế đạo diễn cho phần kết của bộ ba sử thi...',
    date: '28 tháng 2, 2026',
    image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1200&q=80',
    category: 'industry',
  },
  {
    id: 'oscar-2026',
    title: 'Lễ trao giải Oscar 2026: Những đề cử đáng chú ý nhất',
    excerpt:
      'Danh sách đề cử Oscar 2026 chính thức được công bố với nhiều bất ngờ. Các phim indie chiếm ưu thế ở nhiều hạng mục lớn...',
    date: '25 tháng 2, 2026',
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&q=80',
    category: 'industry',
  },
]

/** Get all news items */
export function getNews(): NewsItem[] {
  return NEWS_DATA
}

/** Get news by category */
export function getNewsByCategory(category: NewsItem['category']): NewsItem[] {
  return NEWS_DATA.filter(n => n.category === category)
}

/** Get a single news item by ID */
export function getNewsById(id: string): NewsItem | undefined {
  return NEWS_DATA.find(n => n.id === id)
}
