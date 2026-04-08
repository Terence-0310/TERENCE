// ============================================
// Reviews Module — Types
// ============================================

export interface ReviewItem {
  id: string
  userId: string
  movieId: string
  rating: number
  title: string | null
  content: string | null
  status: string
  isSpoiler: boolean
  likeCount: number
  createdAt: Date
  updatedAt: Date
  user?: {
    name: string
    avatar: string | null
  }
  movie?: {
    title: string
    slug: string
    posterUrl: string | null
  }
}

export interface CreateReviewInput {
  userId: string
  movieId: string
  rating: number
  title?: string
  content?: string
  isSpoiler?: boolean
}
