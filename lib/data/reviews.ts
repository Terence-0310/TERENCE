// ============================================
// Reviews Data Layer — editorial review content
// ============================================
// Reviews are editorial (hand-written) content, not from TMDB API.
// This data layer provides a clean separation from the UI component.

export interface ReviewItem {
  id: string
  title: string
  excerpt: string
  date: string
  image: string
  href?: string
  movieId?: number // TMDB movie ID if applicable
}

// ── Editorial reviews ──
const REVIEWS: ReviewItem[] = [
  {
    id: 'look-back',
    title: 'Look Back – Một bộ phim không hét lên, nhưng khiến người ta im lặng rất lâu',
    excerpt:
      'Look Back không cố làm bạn xúc động. Nó chỉ nhẹ nhàng đặt trước mặt bạn những ký ức, những lần bỏ lỡ và những câu hỏi về đam mê...',
    date: '3 tháng 2, 2026',
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&q=80',
  },
  {
    id: 'cong-anh-ma-chay',
    title: 'Cõng Anh Mà Chạy – Khi tình yêu vượt qua cả thời gian và định mệnh',
    excerpt:
      'Không phải hành động hay khoa học viễn tưởng đơn thuần. Đây là một hành trình cảm xúc về ký ức, mất mát và tình yêu bền bỉ...',
    date: '3 tháng 2, 2026',
    image: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=1200&q=80',
  },
  {
    id: 'left-handed-girl',
    title: '"Left-Handed Girl" - Áp Lực Từ Bàn Tay Khác Biệt',
    excerpt:
      'Bộ phim khắc họa hành trình vượt qua kỳ thị và phản ánh những vấn đề xã hội quan trọng, như sự phân biệt và thiếu thấu hiểu...',
    date: '2 tháng 2, 2026',
    image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&q=80',
  },
  {
    id: 'sam-raimi',
    title: 'Sam Raimi và khả năng làm Spider-Man 4 với Tobey Maguire',
    excerpt:
      'Raimi bày tỏ trong một cuộc phỏng vấn rằng ông vẫn cởi mở với ý tưởng làm phần tiếp theo nếu mọi thứ phù hợp...',
    date: '3 tháng 2, 2026',
    image: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=1200&q=80',
  },
]

/** Get all editorial reviews */
export function getReviews(): ReviewItem[] {
  return REVIEWS
}

/** Get a single review by ID */
export function getReviewById(id: string): ReviewItem | undefined {
  return REVIEWS.find(r => r.id === id)
}
