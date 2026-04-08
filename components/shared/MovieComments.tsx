'use client'

import { useState } from 'react'
import { MessageSquare, Send, Star, User } from 'lucide-react'

export function MovieComments({ movieId }: { movieId: string | number }) {
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState(0)

  // Mock initial comments for UI representation
  const [comments, setComments] = useState([
    {
      id: 1,
      author: 'Người Dùng Khách',
      text: 'Phim rất hay, hình ảnh đẹp và kịch bản cuốn hút. Rất đáng xem!',
      rating: 5,
      date: 'Vừa xong',
    },
    {
      id: 2,
      author: 'Terence Fan',
      text: 'Đoạn giữa hơi chậm nhưng kết thúc bùng nổ. Sẽ xem lại lần 2.',
      rating: 4,
      date: 'Hôm qua',
    }
  ])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return

    const newComment = {
      id: Date.now(),
      author: 'Bạn',
      text: comment,
      rating: rating > 0 ? rating : 5,
      date: 'Vừa xong',
    }

    setComments([newComment, ...comments])
    setComment('')
    setRating(0)
  }

  return (
    <section className="mx-auto mt-14 max-w-7xl px-5 md:px-8 lg:px-10">
      <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
        <MessageSquare className="h-6 w-6 text-primary" />
        Bình luận & Đánh giá
      </h2>

      {/* Comment Form */}
      <div className="mb-8 rounded-2xl bg-card/30 border border-white/[0.06] p-5 shadow-lg">
        <form onSubmit={handleSubmit}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/50">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white/80">Bạn nghĩ gì về phim này?</p>
              <div className="mt-1 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`transition ${rating >= star ? 'text-yellow-400' : 'text-white/20 hover:text-yellow-400/50'}`}
                  >
                    <Star className={`h-5 w-5 ${rating >= star ? 'fill-yellow-400' : ''}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ cảm nghĩ của bạn..."
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pb-12 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition"
              rows={3}
            />
            <button
              type="submit"
              disabled={!comment.trim()}
              className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 hover:bg-primary/90"
            >
              <Send className="h-3 w-3" />
              Gửi bình luận
            </button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-4 rounded-xl bg-card border border-white/[0.04] p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
              <span className="font-bold text-sm">{c.author.charAt(0)}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-white/90">{c.author}</h4>
                <span className="text-xs text-muted-foreground">{c.date}</span>
              </div>
              <div className="mt-1 flex items-center gap-[2px]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${i < c.rating ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}`}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">{c.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
