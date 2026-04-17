'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'
import { AlertCircle, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { usePathname } from 'next/navigation'

export function EmailVerificationBanner() {
  const { user, isAuthenticated } = useAuth()
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    // Only show if user is logged in but NOT verified, and the banner hasn't been dismissed
    if (isAuthenticated && user && user.isEmailVerified === false) {
      // Don't show on the actual verify-email page where they are trying to fix it
      if (!pathname?.startsWith('/verify-email')) {
         setIsVisible(true)
      }
    } else {
      setIsVisible(false)
    }
  }, [user, isAuthenticated, pathname])

  if (!isVisible) return null

  const handleResend = async () => {
    if (!user?.email) return
    setResending(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Đã gửi lại email xác thực')
      } else {
        toast.error(data.error || 'Lỗi gửi email')
      }
    } catch {
      toast.error('Lỗi kết nối tới máy chủ')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-amber-500/10 border border-amber-500/30 backdrop-blur-md rounded-xl p-4 shadow-xl">
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 text-amber-500/60 hover:text-amber-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-3">
          <div className="shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="pr-4">
            <h3 className="text-sm font-bold text-amber-500">Xác thực tài khoản</h3>
            <p className="text-xs text-amber-500/80 mt-1 leading-relaxed">
              Bạn chưa xác thực email. Vui lòng kiểm tra hộp thư của <b>{user?.email}</b> để đảm bảo quyền lợi và bảo mật tài khoản.
            </p>
            <button
              onClick={handleResend}
              disabled={resending}
              className="mt-3 text-xs font-bold px-3 py-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {resending ? 'Đang gửi...' : 'Gửi lại mã xác nhận'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
