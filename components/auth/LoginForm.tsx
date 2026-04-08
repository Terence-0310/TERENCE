'use client'

import { useState } from 'react'
import { useAuthModal } from './auth-modal-store'
import { useAuth } from '@/contexts/auth-context'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export function LoginForm() {
  const { setView, closeModal } = useAuthModal()
  const { login } = useAuth()
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const loginId = authMethod === 'phone' ? `${phone}@phone.terence.vn` : email
      const ok = await login(loginId, password)
      if (ok) closeModal()
      else setError('Thông tin đăng nhập không chính xác')
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full relative">
      <div className="text-center mb-8">
        <h3 className="text-[26px] font-bold text-white mb-2 tracking-tight">Đăng nhập</h3>
        <p className="text-[13px] text-white/50">Đăng nhập để xem phim và quản lý tài khoản</p>
      </div>

      {/* Tabs */}
      <div className="flex w-full bg-[#1A1D2D] rounded-[10px] p-1 mb-6 border border-white/5">
        <button 
          type="button" 
          onClick={() => setAuthMethod('email')}
          className={`flex-1 py-2 text-[13px] font-semibold transition-all capitalize ${authMethod === 'email' ? 'text-white bg-[#0B0F19] rounded-[8px] shadow border border-white/5' : 'text-white/40 hover:text-white'}`}
        >
          Email
        </button>
        <button 
          type="button" 
          onClick={() => setAuthMethod('phone')}
          className={`flex-1 py-2 text-[13px] font-semibold transition-all ${authMethod === 'phone' ? 'text-white bg-[#0B0F19] rounded-[8px] shadow capitalize border border-white/5' : 'text-white/40 hover:text-white'}`}
        >
          Số điện thoại
        </button>
      </div>

      {error && (
        <div className="mb-4 text-xs font-semibold text-red-300 bg-red-500/10 py-2 px-3 rounded-lg border border-red-500/20">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {/* Email or Phone Field Group */}
        {authMethod === 'email' ? (
          <div className="space-y-1.5 flex flex-col items-start animate-fade-in-up">
            <label className="text-[12px] font-bold text-white tracking-wide">Email</label>
            <div className="relative w-full">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40" />
              <Input 
                value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="email@example.com" 
                className="h-12 w-full pl-11 pr-4 bg-[#0B0F19] border-white/10 text-white text-[14px] rounded-[8px] focus:border-teal-400/50 focus:bg-[#12182b] transition-all placeholder:text-white/30" 
                required 
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 flex flex-col items-start animate-fade-in-up">
            <label className="text-[12px] font-bold text-white tracking-wide">Số điện thoại</label>
            <div className="relative w-full">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              <Input 
                value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g, '').substring(0, 15))}
                placeholder="Nhập số điện thoại" 
                className="h-12 w-full pl-11 pr-4 bg-[#0B0F19] border-white/10 text-white text-[14px] rounded-[8px] focus:border-teal-400/50 focus:bg-[#12182b] transition-all placeholder:text-white/30" 
                required 
              />
            </div>
          </div>
        )}
        
        {/* Password Field Group */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-bold text-white tracking-wide">Mật khẩu</label>
            <button type="button" className="text-[12px] font-medium text-teal-400 hover:text-teal-300 transition-colors">
              Quên mật khẩu?
            </button>
          </div>
          <div className="relative w-full">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40" />
            <Input 
              type={showPass ? 'text' : 'password'}
              value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="Nhập mật khẩu" 
              className="h-12 w-full pl-11 pr-11 bg-[#0B0F19] border-white/10 text-white text-[14px] rounded-[8px] focus:border-teal-400/50 focus:bg-[#12182b] transition-all placeholder:text-white/30" 
              required 
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
              {showPass ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </div>

        <Button disabled={loading} type="submit" className="w-full h-12 bg-[#2DD4BF] hover:bg-[#14B8A6] text-black font-semibold text-[15px] rounded-[8px] transition-colors mt-6 shadow-[0_0_20px_rgba(45,212,191,0.15)]">
          {loading ? 'Đang xử lý...' : 'Đăng nhập'}
        </Button>

        {/* Divider */}
        <div className="relative flex items-center py-4">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="shrink-0 px-4 text-[12px] text-white/40">Hoặc đăng nhập bằng</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        {/* Social Login */}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="flex items-center justify-center gap-2 h-11 rounded-[8px] bg-[#0B0F19] border border-white/10 hover:bg-white/5 transition-colors text-[13px] font-semibold text-white">
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button>
          <button type="button" className="flex items-center justify-center gap-2 h-11 rounded-[8px] bg-[#0B0F19] border border-white/10 hover:bg-white/5 transition-colors text-[13px] font-semibold text-white">
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7.5v4H10V22h4v-8.5z" fill="#1877F2"/></svg>
            Facebook
          </button>
        </div>

        <div className="text-center pt-6">
          <p className="text-[13px] text-white/50">
            Chưa có tài khoản?{' '}
            <button type="button" onClick={() => setView('register')} className="text-teal-400 font-semibold hover:underline">
              Đăng ký ngay
            </button>
          </p>
        </div>
      </form>
    </div>
  )
}
