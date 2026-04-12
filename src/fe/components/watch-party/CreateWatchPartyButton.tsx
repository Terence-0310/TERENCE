'use client'

import { useState } from 'react'
import { Users, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/fe/components/ui/dialog'
import { Button } from '@/src/fe/components/ui/button'
import { toast } from 'sonner'

interface CreateWatchPartyButtonProps {
  movieId: string
  movieSlug: string
  movieTitle: string
  episodeId?: string
  episodeSlug?: string
  episodeName?: string
  serverIndex?: number
  posterUrl?: string
  onRoomCreated: (code: string) => void
}

export function CreateWatchPartyButton({
  movieId,
  movieSlug,
  movieTitle,
  episodeId,
  episodeSlug,
  episodeName,
  serverIndex = 0,
  posterUrl,
  onRoomCreated,
}: CreateWatchPartyButtonProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedSize, setSelectedSize] = useState<number>(2)

  async function handleCreate() {
    if (isCreating) return
    setIsCreating(true)

    try {
      const res = await fetch('/api/watch-party/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Xem chung: ${movieTitle}`,
          movieId: movieId || undefined,
          episodeId: episodeId || undefined,
          displayName: 'Chủ phòng',
          maxMembers: selectedSize,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Không thể tạo phòng xem chung')
        return
      }

      const code = data.room?.code || data.room?.roomCode
      if (code) {
        setIsOpen(false)
        onRoomCreated(code)
      } else {
        toast.error('Lỗi định dạng dữ liệu trả về từ máy chủ')
      }
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra khi kết nối máy chủ')
    } finally {
      setIsCreating(false)
    }
  }

  const SIZES = [
    { label: 'Cặp đôi', desc: 'Tối đa 2 người', value: 2 },
    { label: 'Nhóm nhỏ', desc: 'Tối đa 4 người', value: 4 },
    { label: 'Nhóm lớn', desc: 'Tối đa 36 người', value: 36 },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-md transition hover:bg-white/15 hover:text-white"
          title="Tạo phòng xem chung"
        >
          <Users className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Xem chung</span>
        </button>
      </DialogTrigger>
      
      <DialogContent className="max-w-[420px] bg-[#0E131F] border-white/10 sm:rounded-[20px] p-6 shadow-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-[20px] font-bold text-white text-center">
            Thiết lập phòng xem chung
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mb-6">
          <p className="text-sm font-medium text-white/70">Chọn quy mô nhóm của bạn:</p>
          <div className="grid grid-cols-1 gap-3">
            {SIZES.map((size) => (
              <button
                key={size.value}
                onClick={() => setSelectedSize(size.value)}
                className={`flex items-center justify-between px-4 py-3 rounded-[12px] border transition-all ${
                  selectedSize === size.value 
                    ? 'border-[#31CDB8] bg-[#31CDB8]/10' 
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="text-left">
                  <p className={`font-bold text-[15px] ${selectedSize === size.value ? 'text-[#31CDB8]' : 'text-white'}`}>
                    {size.label}
                  </p>
                  <p className="text-[13px] text-white/50">{size.desc}</p>
                </div>
                <Users className={`h-5 w-5 ${selectedSize === size.value ? 'text-[#31CDB8]' : 'text-white/40'}`} />
              </button>
            ))}
          </div>
        </div>

        <Button 
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full h-[48px] rounded-[14px] bg-[#31CDB8] text-[#0A0F1E] font-bold text-[15px] hover:bg-[#2CBDA9] transition-colors"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Đang tạo...
            </>
          ) : (
            'Tạo phòng ngay'
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
