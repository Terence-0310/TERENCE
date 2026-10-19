'use client'

// Heart toggle backed by /api/v1/favorites. Checks current state on mount and
// optimistically toggles on click. Used on the watch page and movie detail.

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'

interface Props {
  movieId: string | number
  /** Visual size variant. */
  className?: string
}

export function FavoriteButton({ movieId, className }: Props) {
  const [favorited, setFavorited] = useState(false)
  const [busy, setBusy] = useState(false)
  const id = String(movieId)
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    fetch(`/api/v1/favorites?movieId=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.success) setFavorited(!!d.favorited) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [id, status])

  const toggle = async () => {
    if (busy) return
    if (status === 'unauthenticated') {
      router.push(`/login?from=${encodeURIComponent(pathname || '/')}`)
      return
    }
    setBusy(true)
    const next = !favorited
    setFavorited(next) // optimistic
    try {
      const res = await fetch('/api/v1/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId: id }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        setFavorited(!next) // revert
        toast.error(data?.error || 'Không thể cập nhật yêu thích', { icon: null })
        return
      }
      setFavorited(!!data.favorited)
      toast.success(data.favorited ? 'Đã thêm vào yêu thích' : 'Đã bỏ khỏi yêu thích', { icon: null })
    } catch {
      setFavorited(!next)
      toast.error('Lỗi kết nối', { icon: null })
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={favorited ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
      title={favorited ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
      className={
        className ??
        `rounded-lg p-2.5 border transition disabled:opacity-50 ${
          favorited
            ? 'bg-primary/15 text-primary border-primary/30'
            : 'bg-white/5 text-white/50 border-white/[0.06] hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <Heart className={`h-4 w-4 ${favorited ? 'fill-primary' : ''}`} />
    </button>
  )
}
