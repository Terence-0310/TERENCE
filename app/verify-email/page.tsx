'use client'

// ============================================
// Verify Email Page — Token verification UI
// ============================================
// Reads ?token= from URL, calls API to verify, shows result.
// Also offers "Resend" functionality.

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react'

type Status = 'loading' | 'success' | 'already' | 'error' | 'no-token'

// useSearchParams must live inside a <Suspense> boundary on Next 15+.
function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<Status>(token ? 'loading' : 'no-token')
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  useEffect(() => {
    if (!token) return

    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
        const data = await res.json()

        if (res.ok) {
          setStatus(data.alreadyVerified ? 'already' : 'success')
          setMessage(data.message)
        } else {
          setStatus('error')
          setMessage(data.error || 'Xác thực thất bại')
        }
      } catch {
        setStatus('error')
        setMessage('Không thể kết nối đến máy chủ')
      }
    }

    verify()
  }, [token])

  const handleResend = async () => {
    if (!resendEmail.trim()) return
    setResending(true)
    setResendMsg('')
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      })
      const data = await res.json()
      setResendMsg(data.message || data.error || 'Đã gửi')
    } catch {
      setResendMsg('Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-background rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-background to-[#1e293b] px-8 py-10 text-center">
          <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 ${
            status === 'success' ? 'bg-green-500/20 scale-110' :
            status === 'already' ? 'bg-blue-500/20 scale-110' :
            status === 'error' ? 'bg-red-500/20 scale-110' :
            status === 'loading' ? 'bg-primary/20 animate-pulse' :
            'bg-primary/20'
          }`}>
            {status === 'loading' && <Loader2 className="w-8 h-8 text-primary animate-spin" />}
            {status === 'success' && <CheckCircle2 className="w-8 h-8 text-green-400" />}
            {status === 'already' && <CheckCircle2 className="w-8 h-8 text-blue-400" />}
            {status === 'error' && <XCircle className="w-8 h-8 text-red-400" />}
            {status === 'no-token' && <Mail className="w-8 h-8 text-primary" />}
          </div>
          <h1 className="text-2xl font-black text-white mb-1">
            {status === 'loading' && 'Đang xác thực...'}
            {status === 'success' && 'Xác thực thành công!'}
            {status === 'already' && 'Đã xác thực'}
            {status === 'error' && 'Xác thực thất bại'}
            {status === 'no-token' && 'Xác thực Email'}
          </h1>
          <p className="text-sm text-white/50">TERENCE</p>
        </div>

        {/* Body */}
        <div className="px-8 py-8">
          {/* Status message */}
          {message && (
            <p className={`text-sm text-center mb-6 leading-relaxed ${
              status === 'success' ? 'text-green-400' :
              status === 'already' ? 'text-blue-400' :
              status === 'error' ? 'text-red-400' :
              'text-white/60'
            }`}>
              {message}
            </p>
          )}

          {/* Success → Go to login */}
          {(status === 'success' || status === 'already') && (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-primary to-primary text-[#022c22] font-bold rounded-xl hover:opacity-90 transition-all active:scale-95"
            >
              Đăng nhập ngay
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          {/* Error or no-token → Resend form */}
          {(status === 'error' || status === 'no-token') && (
            <div className="space-y-4">
              <p className="text-sm text-white/40 text-center">
                Nhập email để gửi lại link xác thực:
              </p>
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder:text-white/30 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              />
              <button
                onClick={handleResend}
                disabled={resending || !resendEmail.trim()}
                className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primary text-[#022c22] font-bold rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {resending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Gửi lại email xác thực
                  </>
                )}
              </button>
              {resendMsg && (
                <p className="text-xs text-center text-primary">{resendMsg}</p>
              )}
            </div>
          )}

          {/* Loading state */}
          {status === 'loading' && (
            <p className="text-sm text-white/40 text-center">
              Vui lòng đợi trong giây lát...
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-white/5 text-center">
          <Link href="/" className="text-xs text-white/30 hover:text-primary transition-colors">
            Quay về trang chủ
          </Link>
        </div>
      </div>
    </div>
  )
}

function VerifyEmailFallback() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-background rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-background to-[#1e293b] px-8 py-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-primary/20 animate-pulse">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Đang tải...</h1>
          <p className="text-sm text-white/50">TERENCE</p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen bg-[#0a0f1a] flex items-center justify-center px-4">
      <Suspense fallback={<VerifyEmailFallback />}>
        <VerifyEmailContent />
      </Suspense>
    </main>
  )
}
