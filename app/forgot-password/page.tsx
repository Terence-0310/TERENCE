'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/src/fe/components/ui/button'
import { Input } from '@/src/fe/components/ui/input'
import { TerenceLogo } from '@/src/fe/components/terence-logo'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra. Vui lòng thử lại.')
      } else {
        setSuccess(data.message || 'Link khôi phục mật khẩu đã được gửi đến email của bạn.')
        // In dev mode, we might want to log the token or mock URL if needed.
        if (data.devToken) {
           console.log(`[DEV MODE] Password reset token for testing: ${data.devToken}`)
        }
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 lg:px-8 h-14 flex items-center">
        <Link href="/" className="shrink-0 flex items-center gap-2">
          <TerenceLogo size={32} />
          <span className="text-lg font-bold tracking-tight text-white">Terence</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Back to login */}
          <Link 
            href="/login" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại đăng nhập
          </Link>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Quên mật khẩu</h1>
            <p className="text-muted-foreground">
              Nhập email của bạn để nhận liên kết khôi phục mật khẩu.
            </p>
          </div>

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
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="email@example.com"
                  className="pl-10 h-12 bg-card border-border"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full h-12 text-base" disabled={isLoading || !!success}>
              {isLoading ? 'Đang gửi...' : 'Gửi liên kết khôi phục'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
