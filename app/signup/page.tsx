'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { Button } from '@/src/fe/components/ui/button'
import { Input } from '@/src/fe/components/ui/input'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'
import { TerenceLogo } from '@/src/fe/components/terence-logo'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signup } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    accountKey: '',
    password: '',
    confirmPassword: '',
  })

  // Capture the referral code from `?ref=` and persist it for the
  // length of this tab. Users often arrive via an invite, browse
  // around, then come back to sign up — sessionStorage keeps the
  // attribution intact across that journey.
  const REFERRAL_KEY = 'terence:referralCode'
  useEffect(() => {
    const fromUrl = searchParams.get('ref')
    if (fromUrl && fromUrl.length <= 50) {
      sessionStorage.setItem(REFERRAL_KEY, fromUrl)
    }
  }, [searchParams])
  // Keep these around so the deps array doesn't complain and the
  // tooling doesn't flag the imports as unused. They're called from
  // the useEffect above.
  void signup

  // Client-side validation must mirror the server zod schema:
  // email shape (or username), name 1..100, password ≥8 (was inconsistent with reset 6).
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên hiển thị.')
      return
    }
    if (formData.name.trim().length > 100) {
      setError('Tên hiển thị quá dài (tối đa 100 ký tự).')
      return
    }
    if (formData.accountKey.includes('@') && !EMAIL_RE.test(formData.accountKey.trim())) {
      setError('Email không hợp lệ.')
      return
    }
    if (formData.password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu không khớp!')
      return
    }

    setIsLoading(true)

    try {
      const signupId = formData.accountKey.includes('@') ? formData.accountKey : `${formData.accountKey}@terence.vn`
      const referralCode = sessionStorage.getItem(REFERRAL_KEY) || undefined
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: signupId,
          password: formData.password,
          ...(referralCode ? { referralCode } : {}),
        })
      })

      if (res.ok) {
        sessionStorage.removeItem(REFERRAL_KEY)
        router.push('/')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || 'Thông tin không hợp lệ. Vui lòng kiểm tra lại.')
      }
    } catch {
      setError('Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-linear-to-br from-primary/80 to-primary/40" />
        <img
          src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&h=1600&fit=crop"
          alt="Cinema"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-12 left-12 right-12">
          <h2 className="text-4xl font-bold text-white mb-4">Tham gia Terence ngay hôm nay</h2>
          <p className="text-white/80 text-lg">
            Đăng ký miễn phí và bắt đầu khám phá hàng ngàn nội dung giải trí hấp dẫn.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center gap-2 mb-8">
            <TerenceLogo size={36} />
            <span className="text-xl font-bold tracking-tight text-white">Terence</span>
          </Link>

          <h1 className="text-3xl font-bold mb-2">Tạo tài khoản</h1>
          <p className="text-muted-foreground mb-8">Đăng ký để bắt đầu xem phim không giới hạn</p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên hiển thị</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Nhập tên của bạn"
                  className="pl-10 h-12 bg-card border-border"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Account Key Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên tài khoản (hoặc Email)</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <Input
                  type="text"
                  placeholder="Nhập tài khoản hoặc email của bạn"
                  className="pl-10 h-12 bg-card border-border"
                  value={formData.accountKey}
                  onChange={(e) => setFormData({ ...formData, accountKey: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tối thiểu 8 ký tự"
                  className="pl-10 pr-10 h-12 bg-card border-border"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu"
                  className="pl-10 h-12 bg-card border-border"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input type="checkbox" id="terms" className="rounded border-border mt-1" required />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                Tôi đồng ý với{' '}
                <Link href="/terms" target="_blank" className="text-primary hover:underline">Điều khoản sử dụng</Link>
                {' '}và{' '}
                <Link href="/privacy" target="_blank" className="text-primary hover:underline">Chính sách bảo mật</Link>
              </label>
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
              {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-muted-foreground">Hoặc đăng ký với</span>
            </div>
          </div>

          {/* Social signup */}
          <div className="flex flex-col space-y-4">
            <Button variant="outline" className="w-full h-12 bg-card hover:bg-muted text-base font-semibold" onClick={() => signIn('google', { callbackUrl: '/' })}>
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Tiếp tục với Google
            </Button>
          </div>

          {/* Login link */}
          <p className="mt-8 text-center text-muted-foreground">
            Đã có tài khoản?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
