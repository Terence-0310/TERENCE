import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { useCreateRoom } from '@/lib/watch-party/client'
import { useRouter } from 'next/navigation'

export function WatchPartyHero() {
  const [joinCode, setJoinCode] = useState('')
  const { createRoom, isCreating } = useCreateRoom()
  const router = useRouter()

  async function handleQuickCreate() {
    const res = await createRoom({
      roomName: 'Phòng xem chung Terence',
      roomType: 'group',
      visibility: 'public',
      roomMode: 'cinema',
      movieId: 'demo-movie',
      maxMembers: 12,
    })
    if (res?.room?.code) {
      router.push(`/xem-chung/${res.room.code}`)
    }
  }

  function handleJoin() {
    if (!joinCode) return
    router.push(`/xem-chung/${joinCode.trim().toUpperCase()}`)
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,#0D3B35,#020617)] px-6 py-8 md:px-10 md:py-10 shadow-[0_30px_80px_rgba(0,0,0,0.9)]">
      <div className="absolute inset-0 opacity-30 mix-blend-screen bg-[url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&q=80')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-linear-to-r from-black/85 via-black/40 to-transparent" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <div className="max-w-xl space-y-4">
          <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-white/80 border border-white/20">
            Xem chung • Watch Party
          </p>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
            Xem phim cùng bạn bè, cặp đôi và nhóm của bạn.
          </h1>
          <p className="text-sm md:text-base text-white/75">
            Tạo phòng xem chung, đồng bộ thời gian phát, chat realtime và thưởng thức những bộ phim yêu thích theo cách
            cinematic nhất.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleQuickCreate} disabled={isCreating}>
              Tạo phòng nhanh
            </Button>

            <div className="flex-1 flex items-center gap-2">
              <Input
                placeholder="Nhập mã phòng..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="h-10 bg-black/40 border-white/20 text-sm"
              />
              <Button variant="outline" size="sm" className="h-10" onClick={handleJoin}>
                Tham gia
              </Button>
            </div>
          </div>
        </div>

        <div className="w-full md:w-80 lg:w-96 shrink-0">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" className="w-full h-auto min-h-[6rem] rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 text-white flex flex-col items-start justify-center px-5 py-4 gap-1.5 overflow-hidden whitespace-normal text-left">
                <span className="text-sm font-semibold">Tạo phòng nâng cao</span>
                <span className="text-xs text-white/75 leading-relaxed">
                  Chọn loại phòng, giới hạn người tham gia, quyền điều khiển và nhiều hơn nữa.
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Tạo phòng xem chung (demo)</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Phiên bản demo này chỉ minh họa UI/UX. Bạn có thể mở rộng để lưu thiết lập thật vào database và dùng
                websocket cho realtime.
              </p>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  )
}

