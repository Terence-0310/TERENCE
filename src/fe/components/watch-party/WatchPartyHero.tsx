'use client'

// ============================================
// Watch Party Hero — Updated for Prisma API
// ============================================

import { Button } from '@/src/fe/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/fe/components/ui/dialog'
import { Input } from '@/src/fe/components/ui/input'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'

// Fetch a trending movie backdrop for the hero background
const backdropFetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const movies = data.results || data.items || []
  const withBackdrop = movies.find((m: any) => m.backdrop_path || m.backdrop)
  if (!withBackdrop) return null
  const path = withBackdrop.backdrop_path || withBackdrop.backdrop
  return path ? `https://image.tmdb.org/t/p/w1280${path}` : null
}

import { CreateWatchRoomGuideModal } from './CreateWatchRoomGuideModal'

export function WatchPartyHero() {
  const [joinCode, setJoinCode] = useState('')
  const router = useRouter()

  function handleJoin() {
    if (!joinCode) return
    router.push(`/xem-chung/${joinCode.trim().toUpperCase()}`)
  }

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-white/[0.04] bg-[#050A15] px-6 py-10 md:px-12 md:py-16 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
      {/* Background with blur and depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A1931] via-[#050A15] to-[#02040A] opacity-90" />
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[80%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[60%] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-10 z-10 w-full relative">
        <div className="max-w-2xl space-y-5">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]">
            Trải nghiệm xem cùng nhau<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              không giới hạn khoảng cách
            </span>
          </h1>
          <p className="text-base md:text-lg text-white/50 font-medium max-w-xl leading-relaxed">
            Mời bạn bè, người yêu cùng xem chung những bộ phim chiếu rạp mới nhất với độ trễ cực thấp, chat realtime mượt mà.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4 w-full max-w-md">
            <CreateWatchRoomGuideModal>
              <Button size="lg" className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(var(--primary),0.3)]">
                Tạo phòng mới
              </Button>
            </CreateWatchRoomGuideModal>

            <div className="flex-1 flex items-center gap-2 relative">
              <Input
                placeholder="Nhập mã phòng..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                className="h-12 rounded-full bg-white/[0.03] border-white/10 text-sm font-medium focus:border-primary/50 focus:bg-white/[0.05] pl-5 pr-24 transition-colors"
              />
              <Button 
                size="sm" 
                className="absolute right-1 top-1 bottom-1 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border-0 font-medium px-4" 
                onClick={handleJoin}
              >
                Tham gia
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
