'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/src/fe/components/ui/button'
import { Input } from '@/src/fe/components/ui/input'
import { TerenceLogo } from '@/src/fe/components/terence-logo'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      setError('Token không hợp lệ. Vui lòng thử yêu cầu lại một link mới.')
      return
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }

    // Align with server schema (resetPasswordSchema): min 8 chars.
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra. Vui lòng thử lại.')
      } else {
        setSuccess('Mật khẩu của bạn đã được đặt lại thành công. Bạn đang được chuyển hướng đến trang đăng nhập...')
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Đặt lại mật khẩu</h1>
        <p className="text-muted-foreground">
          Nhập mật khẩu mới cho tài khoản của bạn.
        </p>
      </div>

      {!token && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-sm">
          Thiếu token khôi phục. Vui lòng kiểm tra lại liên kết trong email của bạn.
        </div>
      )}

      {/* Error & Success Messages */}
      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Password Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Mật khẩu mới</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu mới"
              className="pl-10 pr-10 h-12 bg-card border-border"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!token || !!success}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              disabled={!token || !!success}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Confirm Password Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Xác nhận mật khẩu mới</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Nhập lại mật khẩu mới"
              className="pl-10 pr-10 h-12 bg-card border-border"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={!token || !!success}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              disabled={!token || !!success}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <Button 
          type="submit" 
          className="w-full h-12 text-base" 
          disabled={isLoading || !token || !!success}
        >
          {isLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 lg:px-8 h-14 flex items-center">
        <Link href="/" className="shrink-0 flex items-center gap-2">
          <TerenceLogo size={32} />
          <span className="text-lg font-bold tracking-tight text-white">Terence</span>
        </Link>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Back to login */}
        <div className="w-full max-w-md mb-6">
          <Link 
            href="/login" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại đăng nhập
          </Link>
        </div>

        <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Đang tải...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
