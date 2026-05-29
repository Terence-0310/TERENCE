'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Save, Camera, History, Star, UserCircle, Edit3, Settings, BadgeCheck } from 'lucide-react'
import { Button } from '@/src/fe/components/ui/button'
import { Input } from '@/src/fe/components/ui/input'
import { Textarea } from '@/src/fe/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/src/fe/components/ui/avatar'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'

interface UserProfile {
  id: string
  name: string
  email: string
  avatar: string | null
  bio: string | null
  role: string
  createdAt: string
  isEmailVerified: boolean
}

interface UserStats {
  watchHistory: number
  reviews: number
}

interface ActivePerk {
  optionId: string
  name: string
  purchasedAt: string
  activeUntil: string | null
  durationDays?: number
}

interface ActivePerks {
  avatarFrame: ActivePerk | null
  removeAds: ActivePerk | null
  hdUpgrade: ActivePerk | null
  earlyAccess: ActivePerk | null
  exclusiveBadge: ActivePerk | null
  roomTheme: ActivePerk | null
}

export default function ProfilePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { update: updateSession } = useSession()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [perks, setPerks] = useState<ActivePerks | null>(null)
  const [verifyEmailClaimed, setVerifyEmailClaimed] = useState(false)
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState<{ text: string; ok: boolean } | null>(null)
  
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchProfile()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile')
      const data = await res.json()
      
      // Unwrap api envelope { success, data } if present
      const payload = data?.data ?? data
      if (res.ok && payload?.user) {
        setProfile(payload.user)
        setStats(payload.stats)
        setPerks(payload.activePerks || null)
        setVerifyEmailClaimed(!!payload.verifyEmailClaimed)
        setName(payload.user.name || '')
        setBio(payload.user.bio || '')
        setAvatarPreview(payload.user.avatar || null)
      } else {
        setError(data.error || 'Lỗi lấy thông tin cá nhân')
      }
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio, avatar: avatarPreview }),
      })

      const data = await res.json()
      const payload = data?.data ?? data

      if (!res.ok) {
        setError(payload?.error || data?.error || 'Cập nhật thất bại')
      } else {
        // PATCH returns a partial user ({id,name,email,role,avatar,bio}); merge
        // it so createdAt/isEmailVerified from the loaded profile are preserved.
        if (payload?.user) {
          setProfile((prev) => (prev ? { ...prev, ...payload.user } : payload.user))
        }
        // Push avatar + name into the NextAuth JWT so the header updates
        // immediately, without a re-login or full page reload.
        try {
          await updateSession({ name, picture: avatarPreview })
        } catch {
          /* header will catch up on the next session refresh */
        }
        setSuccess(data?.message || 'Cập nhật hồ sơ thành công')
      }
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Email verification ──
  // Two paths: (a) email not yet verified → resend the verification mail;
  // (b) already verified but +20 TCoin not yet credited (Google OAuth users)
  // → claim it. Both go through the same button.
  const handleEmailVerifyAction = async () => {
    if (!profile) return
    setVerifyBusy(true)
    setVerifyMessage(null)
    try {
      if (!profile.isEmailVerified) {
        // Not verified → send the verification mail
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: profile.email }),
        })
        const data = await res.json()
        if (res.ok) {
          setVerifyMessage({ text: data.message || 'Đã gửi mail xác minh. Kiểm tra hộp thư.', ok: true })
        } else {
          setVerifyMessage({ text: data.error || 'Không gửi được mail xác minh', ok: false })
        }
      } else {
        // Verified → claim the +20 TCoin
        const res = await fetch('/api/tcoin/reward/verify-email', { method: 'POST' })
        const data = await res.json()
        const payload = data?.data ?? data
        if (res.ok) {
          setVerifyMessage({ text: payload?.message || 'Đã nhận thưởng', ok: true })
          setVerifyEmailClaimed(true)
        } else {
          setVerifyMessage({ text: payload?.error || data?.error || 'Không nhận được thưởng', ok: false })
        }
      }
    } catch {
      setVerifyMessage({ text: 'Lỗi kết nối', ok: false })
    } finally {
      setVerifyBusy(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError('')
    setSuccess('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/user/profile/avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Lỗi tải ảnh lên')
      } else {
        setAvatarPreview(data.url)
        setSuccess('Tải ảnh đại diện thành công. Vui lòng nhấn Lưu thay đổi.')
      }
    } catch {
      setError('Lỗi kết nối khi tải ảnh')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-[#2DD4BF] animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center blur-[8px] opacity-50 bg-primary animate-pulse rounded-full z-[-1]" />
        </div>
      </div>
    )
  }

  if (!profile) return null

  const registeredDate = new Date(profile.createdAt).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  return (
    <main className="min-h-[100dvh] bg-background text-white pb-20 pt-[88px]">
      {/* Ambient glowing background instead of a thick empty banner */}
      <div className="fixed top-0 inset-x-0 h-[60vh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Dashboard Profile Header Card */}
        <div className="bg-background/90 backdrop-blur-xl border border-white/[0.06] rounded-[24px] p-6 md:p-8 shadow-2xl mb-8 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary rounded-full blur-[120px] opacity-[0.08]" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[#4B48A1] rounded-full blur-[100px] opacity-[0.1]" />

          {/* Avatar Container */}
          <div className="relative group cursor-pointer shrink-0 z-10" onClick={() => fileInputRef.current?.click()}>
            {/* Neon frame perk (khi user đã đổi 150 TCoin lấy khung viền) */}
            {perks?.avatarFrame && (
              <div
                className="absolute -inset-1.5 rounded-full pointer-events-none animate-spin-slow"
                style={{
                  background:
                    'conic-gradient(from 0deg, #2dd4bf, #38bdf8, #a78bfa, #f472b6, #2dd4bf)',
                  filter: 'blur(2px)',
                }}
                aria-hidden
              />
            )}
            <div className="absolute inset-0 rounded-full bg-primary blur-[20px] opacity-[0.15] transition-opacity duration-500 group-hover:opacity-[0.25]" />
            <Avatar
              className={`w-[120px] h-[120px] md:w-[140px] md:h-[140px] border-[4px] shadow-2xl relative bg-background transition-shadow ${
                perks?.avatarFrame
                  ? 'border-transparent shadow-[0_0_30px_rgba(45,212,191,0.55)]'
                  : 'border-border'
              }`}
            >
              <AvatarImage src={avatarPreview || ''} alt={profile.name} className="object-cover" />
              <AvatarFallback className="text-4xl font-bold bg-gradient-to-b from-primary to-primary text-white">
                {profile.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="absolute inset-x-0 bottom-0 top-0 m-1 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center overflow-hidden border border-white/10 backdrop-blur-sm">
              <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex flex-col items-center">
                <Camera className="w-8 h-8 text-white mb-2" />
                <span className="text-[10px] font-semibold text-white/90 uppercase tracking-widest">Đổi ảnh</span>
              </div>
            </div>
            
            {isUploading && (
              <div className="absolute inset-x-0 bottom-0 top-0 m-1 rounded-full bg-black/80 flex items-center justify-center z-10">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
            />
          </div>

          {/* User Info (Aligned Center/Left) */}
          <div className="flex-1 text-center md:text-left z-10 md:pt-4">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-3 flex items-center justify-center md:justify-start gap-4 flex-wrap">
              {profile.name}
              <span className="inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(45,212,191,0.05)]">
                {profile.role.replace('_', ' ')}
              </span>
              {perks?.exclusiveBadge && (
                <span
                  title="Huy hiệu đặc biệt — đổi 200 TCoin"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-amber-400/10 text-amber-300 border border-amber-400/30 shadow-[0_0_15px_rgba(251,191,36,0.1)]"
                >
                  <BadgeCheck className="w-3.5 h-3.5 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]" />
                  Huy hiệu đặc biệt
                </span>
              )}
            </h1>
            <p className="text-white/60 text-sm flex items-center justify-center md:justify-start gap-3 flex-wrap">
              <span className="flex items-center gap-2"><UserCircle className="w-4 h-4 opacity-70" />{profile.email}</span>
              <span className="hidden md:inline w-1 h-1 rounded-full bg-white/20"></span>
              <span className="opacity-80 block md:inline w-full md:w-auto">Gia nhập {registeredDate}</span>
            </p>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 space-y-6">
            {/* Stats Card */}
            <div className="bg-background/90 backdrop-blur-xl border border-white/[0.06] rounded-[24px] p-7 shadow-2xl relative overflow-hidden group hover:border-primary/30 transition-colors duration-500">
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-700 transform group-hover:scale-110">
                 <History className="w-32 h-32 text-white" />
              </div>
              <h3 className="font-bold text-[15px] mb-8 flex items-center text-white/90 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mr-3 shadow-[0_0_10px_rgba(45,212,191,0.8)]"></span>
                Tương tác nền tảng
              </h3>
              
              <div className="space-y-8 relative z-10">
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[13px] font-medium text-white/60">Phim đã thưởng thức</span>
                    <span className="text-3xl font-black text-white tabular-nums leading-none tracking-tighter drop-shadow-sm">
                      {stats?.watchHistory || 0}
                    </span>
                  </div>
                  <div className="w-full bg-background rounded-full h-1.5 overflow-hidden border border-white/5">
                    <div className="bg-gradient-to-r from-[rgba(45,212,191,0.4)] to-primary h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats?.watchHistory || 0) * 5)}%` }} />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[13px] font-medium text-white/60">Bài đánh giá / Tranh luận</span>
                    <span className="text-3xl font-black text-white tabular-nums leading-none tracking-tighter drop-shadow-sm">
                      {stats?.reviews || 0}
                    </span>
                  </div>
                  <div className="w-full bg-background rounded-full h-1.5 overflow-hidden border border-white/5">
                    <div className="bg-gradient-to-r from-[rgba(45,212,191,0.4)] to-primary h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats?.reviews || 0) * 10)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Email verification — drives the +20 TCoin reward */}
            <div className="bg-background/90 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-7 shadow-2xl">
              <h3 className="font-bold text-[15px] mb-5 flex items-center text-white/90 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mr-3 shadow-[0_0_10px_rgba(45,212,191,0.8)]" />
                Xác minh email
              </h3>

              <div className="flex items-center gap-3 mb-4">
                {profile.isEmailVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Đã xác minh
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Chưa xác minh
                  </span>
                )}
                <span className="text-[11px] text-white/40 truncate">{profile.email}</span>
              </div>

              {verifyEmailClaimed ? (
                <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-[12px] text-emerald-300/90">
                  ✅ Đã nhận thưởng <span className="font-bold">+20 TCoin</span> cho xác minh email.
                </p>
              ) : (
                <>
                  <p className="text-[12px] text-white/50 leading-relaxed mb-3">
                    {profile.isEmailVerified
                      ? 'Email đã được xác minh. Bấm bên dưới để nhận thưởng +20 TCoin (1 lần).'
                      : 'Gửi link xác minh đến hộp thư của bạn. Sau khi xác minh xong, bạn sẽ tự động được +20 TCoin.'}
                  </p>
                  <button
                    onClick={handleEmailVerifyAction}
                    disabled={verifyBusy}
                    className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verifyBusy
                      ? 'Đang xử lý...'
                      : profile.isEmailVerified ? 'Nhận 20 TCoin' : 'Gửi mail xác minh'}
                  </button>
                </>
              )}

              {verifyMessage && (
                <p className={`mt-3 text-[12px] ${verifyMessage.ok ? 'text-emerald-300' : 'text-red-400'}`}>
                  {verifyMessage.text}
                </p>
              )}
            </div>

            {/* Active perks card — quy đổi từ TCoin spend */}
            <PerksCard perks={perks} />

            <div className="bg-gradient-to-br from-[#181636] to-[#0D1017] border border-[#4B48A1]/30 rounded-[24px] p-7 shadow-2xl relative overflow-hidden group">
               <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#4B48A1] rounded-full blur-[60px] opacity-30" />
               <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-primary rounded-full blur-[80px] opacity-[0.15]" />
               
               <div className="flex justify-between items-center mb-2 relative z-10">
                  <h3 className="font-bold text-white/90 text-[15px] uppercase tracking-widest flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500/40" /> Thẻ Nền Tảng
                  </h3>
               </div>
               <div className="text-[11px] text-white/40 uppercase tracking-widest mb-8 font-mono relative z-10">ID • {profile.id.substring(0, 12)}...</div>
               
               <div className="flex justify-between items-end relative z-10">
                 <div>
                   <p className="text-[10px] text-white/40 mb-1.5 tracking-widest uppercase">Trạng Thái Thẻ</p>
                   <p className="font-black text-primary text-[15px] uppercase tracking-wider drop-shadow-[0_0_10px_rgba(45,212,191,0.3)]">Hoạt Động</p>
                 </div>
                 <div className="h-9 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-white/20 uppercase tracking-widest text-xs">
                   TERENCE
                 </div>
               </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-8">
            <div className="bg-background/90 backdrop-blur-xl border border-white/[0.06] rounded-[24px] p-7 md:p-8 shadow-2xl relative overflow-hidden">
              
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                <h2 className="text-xl md:text-2xl font-bold flex items-center tracking-tight text-white/90">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mr-4 border border-primary/20">
                    <Edit3 className="w-5 h-5 text-primary" />
                  </div>
                  Thông Tin Tổng Quan
                </h2>
              </div>
              
              {error && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-[16px] flex items-center gap-3 text-red-400 text-sm font-medium">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)] shrink-0" />
                  {error}
                </div>
              )}
              
              {success && (
                <div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-[16px] flex items-center gap-3 text-primary text-sm font-medium">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(45,212,191,0.8)] shrink-0" />
                  {success}
                </div>
              )}

              <form onSubmit={handleUpdate} className="space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Tên hiển thị</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nhập tên của bạn"
                      className="bg-background border-white/10 h-[52px] rounded-[14px] text-[15px] focus:border-primary/50 focus:ring-1 focus:ring-primary/50 hover:border-white/20 transition-all font-medium px-4 shadow-inner"
                      required
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-white/30 uppercase tracking-widest flex items-center justify-between">
                      Email đăng nhập
                      <span className="text-[9px] bg-white/5 py-0.5 px-2 rounded-full">Không thể đổi</span>
                    </label>
                    <Input
                      value={profile.email}
                      disabled
                      className="bg-background/50 border-transparent h-[52px] rounded-[14px] text-[15px] text-white/40 cursor-not-allowed select-none px-4"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Giới thiệu bản thân (Bio)</label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Viết một vài dòng thú vị về bạn hoặc đạo diễn, vũ trụ điện ảnh bạn yêu thích..."
                    className="min-h-[160px] bg-background border-white/10 rounded-[16px] text-[15px] p-5 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 hover:border-white/20 transition-all resize-y leading-relaxed font-medium shadow-inner"
                  />
                  <p className="text-[11px] text-white/30 text-right mt-2 font-medium">Bạn có thể viết những câu quotes phim yêu thích ở đây.</p>
                </div>

                <div className="pt-8 flex flex-col md:flex-row items-center justify-between border-t border-white/5 gap-6">
                  <div className="text-[12px] text-white/40 font-medium flex items-center gap-2">
                    <Settings className="w-4 h-4 opacity-50" />
                    Các thay đổi sẽ được lưu trên toàn hệ thống thời gian thực.
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={isSaving || isUploading} 
                    className="w-full md:w-auto h-[52px] px-10 rounded-[14px] bg-primary hover:bg-primary text-black font-extrabold text-[15px] shadow-[0_0_25px_rgba(45,212,191,0.25)] transition-all hover:shadow-[0_0_35px_rgba(45,212,191,0.4)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                         <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                         Đang cập nhật...
                      </span>
                    ) : (
                      <>
                        <Save className="w-5 h-5 flex-shrink-0" />
                        Lưu Thay Đổi
                      </>
                    )}
                  </Button>
                </div>
                
              </form>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}

// ════════════════════════════════════════════════
// Active perks card — danh sách ưu đãi TCoin đang dùng
// ════════════════════════════════════════════════
function PerksCard({ perks }: { perks: ActivePerks | null }) {
  const items = perks
    ? [
        { key: 'avatarFrame', perk: perks.avatarFrame, label: 'Khung viền avatar Neon' },
        { key: 'removeAds', perk: perks.removeAds, label: 'Xóa quảng cáo' },
        { key: 'hdUpgrade', perk: perks.hdUpgrade, label: 'Nâng HD → Full HD' },
        { key: 'earlyAccess', perk: perks.earlyAccess, label: 'Xem sớm 24h' },
        { key: 'exclusiveBadge', perk: perks.exclusiveBadge, label: 'Huy hiệu đặc biệt' },
        { key: 'roomTheme', perk: perks.roomTheme, label: 'Theme phòng xem chung' },
      ]
    : []

  const active = items.filter((i) => i.perk)

  return (
    <div className="bg-background/90 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-7 shadow-2xl">
      <h3 className="font-bold text-[15px] mb-5 flex items-center text-white/90 uppercase tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full bg-primary mr-3 shadow-[0_0_10px_rgba(45,212,191,0.8)]" />
        Ưu đãi đang dùng
      </h3>

      {active.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center">
          <p className="text-sm text-white/40">Chưa kích hoạt ưu đãi nào.</p>
          <a
            href="/tcoin"
            className="mt-2 inline-block text-xs font-semibold text-primary hover:text-primary/80"
          >
            Đổi TCoin lấy ưu đãi →
          </a>
        </div>
      ) : (
        <ul className="space-y-2">
          {active.map(({ key, perk, label }) => {
            if (!perk) return null
            const remainingDays = perk.activeUntil
              ? Math.max(
                  0,
                  Math.ceil(
                    (new Date(perk.activeUntil).getTime() - Date.now()) / 86_400_000
                  )
                )
              : null
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{label}</p>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    Kích hoạt{' '}
                    {new Date(perk.purchasedAt).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    remainingDays === null
                      ? 'bg-primary/15 text-primary'
                      : remainingDays > 3
                      ? 'bg-white/5 text-white/60'
                      : 'bg-amber-500/15 text-amber-300'
                  }`}
                >
                  {remainingDays === null ? 'Vĩnh viễn' : `Còn ${remainingDays}d`}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
