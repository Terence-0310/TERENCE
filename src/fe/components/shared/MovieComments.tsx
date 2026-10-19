'use client'

import { useState, useEffect, useMemo } from 'react'
import { MessageSquare, Send, Star, User, Loader2, AlertTriangle, ThumbsUp } from 'lucide-react'
import { UserAvatar } from '@/src/fe/components/shared/UserAvatar'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'
import { useAuthModal } from '@/src/fe/components/auth/auth-modal-store'
import { useMovieRoom } from '@/src/fe/lib/realtime/hooks'
import { toast } from 'sonner'

function SpoilerText({ text, isSpoiler }: { text: string, isSpoiler: boolean }) {
  const [revealed, setRevealed] = useState(!isSpoiler)
  if (revealed) return <p className="mt-2 text-sm text-white/80 leading-relaxed">{text}</p>
  return (
    <div 
      onClick={() => setRevealed(true)}
      className="mt-2 relative rounded-lg border border-yellow-500/20 p-4 cursor-pointer group overflow-hidden bg-black/40"
    >
      <div className="absolute inset-0 backdrop-blur-[6px] z-10 flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/60 transition">
        <AlertTriangle className="h-5 w-5 text-yellow-500 mb-1" />
        <span className="text-xs font-bold text-white/90">Bình luận có chứa Spoil (Tiết lộ nội dung)</span>
        <span className="text-[10px] text-white/50 mt-1">Nhấp để xem (Bạn tự chịu trách nhiệm nhé)</span>
      </div>
      {/* Blurred fake text */}
      <p className="text-sm text-white/20 select-none opacity-40 blur-[4px]">
        {text.length > 100 ? text.substring(0, 100) + '...' : text}
      </p>
    </div>
  )
}

export function MovieComments({ movieId }: { movieId: string | number }) {
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState(0)
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sortBy, setSortBy] = useState<'newest' | 'helpful' | 'rating'>('newest')
  const [likedReviews, setLikedReviews] = useState<string[]>([])

  const { isAuthenticated, user } = useAuth()
  const { openModal } = useAuthModal()

  // Realtime: live new comments + like counts for everyone viewing this movie.
  useMovieRoom(String(movieId), user?.id ?? null, {
    onReviewCreated: (p) => {
      setComments((prev) => (prev.some((c) => c.id === p.id) ? prev : [p, ...prev]))
    },
    onReviewLiked: (p) => {
      setComments((prev) => prev.map((c) => (c.id === p.id ? { ...c, likeCount: p.likeCount } : c)))
    },
  })

  useEffect(() => {
    fetch(`/api/v1/movies/${movieId}/reviews`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setComments(res.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [movieId])

  const stats = useMemo(() => {
    if (comments.length === 0) return null
    const total = comments.length
    const avg = comments.reduce((sum, c) => sum + c.rating, 0) / total
    const counts = [5, 4, 3, 2, 1].map(stars => ({
      stars,
      count: comments.filter(c => c.rating === stars).length,
      percent: Math.round((comments.filter(c => c.rating === stars).length / total) * 100)
    }))
    return { total, avg: avg.toFixed(1), counts }
  }, [comments])

  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      if (sortBy === 'helpful') return (b.likeCount || 0) - (a.likeCount || 0)
      if (sortBy === 'rating') return b.rating - a.rating
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [comments, sortBy])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) return openModal('login')
    if (!comment.trim()) return
    if (rating === 0) return toast.error('Vui lòng chọn số sao đánh giá')

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/v1/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId: String(movieId), rating, content: comment, isSpoiler }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      
      setComments([data.data, ...comments])
      setComment('')
      setRating(0)
      setIsSpoiler(false)

      if (data.tcoinRewarded) {
        toast.success('Đã gửi đánh giá (+50 TCoin)! Bình luận sẽ hiển thị sau khi được duyệt.', { duration: 6000 })
      } else {
        toast.success('Đã gửi! Bình luận của bạn đang chờ duyệt.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLike = async (id: string) => {
    if (!isAuthenticated) return openModal('login')
    if (likedReviews.includes(id)) return
    
    setLikedReviews(prev => [...prev, id])
    setComments(prev => prev.map(c => c.id === id ? { ...c, likeCount: (c.likeCount || 0) + 1 } : c))
    
    try {
      await fetch(`/api/v1/reviews/${id}/like`, { method: 'POST' })
    } catch {
      // ignore
    }
  }

  return (
    <section className="mx-auto mt-14 max-w-7xl px-5 md:px-8 lg:px-10 flex flex-col min-h-64 mb-20">
      <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
        <MessageSquare className="h-6 w-6 text-primary" />
        Bình luận & Đánh giá
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        <div className="flex-1 order-2 lg:order-1">
          {/* Comment Form */}
          <div className="mb-8 rounded-2xl bg-card/30 border border-white/[0.06] p-5 shadow-lg relative">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
                <button 
                  onClick={() => openModal('login')}
                  className="bg-primary text-white font-bold py-2 px-6 rounded-full hover:bg-primary/90 transition shadow-lg"
                >
                  Đăng nhập để bình luận
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className={!isAuthenticated ? 'opacity-50 pointer-events-none' : ''}>
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
                        className={`transition ${rating >= star ? 'text-primary' : 'text-white/20 hover:text-primary/50'}`}
                      >
                        <Star className={`h-6 w-6 ${rating >= star ? 'fill-primary' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative mb-2">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chia sẻ cảm nghĩ của bạn..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pb-4 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition resize-none"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-medium text-white/50 cursor-pointer hover:text-white/80 transition select-none">
                  <input 
                    type="checkbox" 
                    checked={isSpoiler} 
                    onChange={e => setIsSpoiler(e.target.checked)}
                    className="rounded bg-black/50 border-white/20 text-primary focus:ring-primary/50"
                  />
                  <span>Chứa Spoiler (Tiết lộ nội dung)</span>
                </label>

                <button
                  type="submit"
                  disabled={!comment.trim() || isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-white transition disabled:opacity-50 hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Send className="h-3.5 w-3.5" />}
                  Gửi bình luận
                </button>
              </div>
            </form>
          </div>

          {/* Sắp xếp */}
          {!loading && comments.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-white/70">{comments.length} bình luận</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'helpful' | 'rating')}
                className="bg-transparent border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary/50"
              >
                <option value="newest" className="bg-background text-white">Mới nhất</option>
                <option value="helpful" className="bg-background text-white">Hữu ích nhất</option>
                <option value="rating" className="bg-background text-white">Điểm cao nhất</option>
              </select>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-white/30"/></div>
            ) : sortedComments.length === 0 ? (
              <div className="text-center py-12 border border-white/[0.04] rounded-2xl bg-card/10">
                <p className="text-white/40 text-sm mb-2">Chưa có bình luận nào.</p>
                <p className="text-primary font-bold text-sm">Hãy trở thành Nhà Phê Bình đầu tiên!</p>
              </div>
            ) : (
              sortedComments.map((c: any) => (
                <div key={c.id} className="flex gap-4 rounded-xl bg-card border border-white/[0.04] p-5 transition hover:bg-card/80">
                  <UserAvatar
                    src={c.avatar}
                    name={c.author}
                    frameActive={c.frameActive}
                    badgeActive={c.badgeActive}
                    className="h-10 w-10"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-white/90 truncate">{c.author}</h4>
                      <span className="text-[11px] text-white/30 shrink-0">{c.date}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-[2px]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < c.rating ? 'fill-primary text-primary' : 'text-white/10'}`}
                        />
                      ))}
                    </div>
                    
                    <SpoilerText text={c.text} isSpoiler={c.isSpoiler} />

                    <div className="mt-3 flex items-center gap-4">
                      <button 
                        onClick={() => handleLike(c.id)}
                        className={`flex items-center gap-1.5 text-xs font-semibold transition ${likedReviews.includes(c.id) ? 'text-primary' : 'text-white/30 hover:text-white/60'}`}
                      >
                        <ThumbsUp className={`h-3.5 w-3.5 ${likedReviews.includes(c.id) ? 'fill-primary' : ''}`} />
                        Hữu ích ({c.likeCount || 0})
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rating Breakdown Sidebar */}
        <div className="order-1 lg:order-2">
          <div className="rounded-2xl border border-white/[0.06] bg-card p-6 sticky top-24">
            <h3 className="text-base font-bold text-white mb-6">Tổng quan đánh giá</h3>
            {stats ? (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-5xl font-black text-white">{stats.avg}</div>
                  <div className="flex flex-col">
                    <div className="flex gap-0.5 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < Math.round(Number(stats.avg)) ? 'fill-primary text-primary' : 'text-white/20'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-white/50">{stats.total} bài đánh giá</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {stats.counts.map(row => (
                    <div key={row.stars} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-10 shrink-0">
                        <span className="text-sm font-bold text-white/70">{row.stars}</span>
                        <Star className="h-3 w-3 fill-white/30 text-white/30" />
                      </div>
                      <div className="h-2 flex-1 rounded-full bg-white/5 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-primary" 
                          style={{ width: `${row.percent}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-white/40">{row.percent}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <Star className="h-10 w-10 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/30">Chưa có đánh giá nào</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
