import Link from 'next/link'
import Image from 'next/image'
import { Users, Lock, Video } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { WatchRoom } from '@/lib/watch-party/types'

type Props = {
  room: WatchRoom
  memberCount?: number
}

export function WatchRoomCard({ room, memberCount }: Props) {
  const isLive = room.status === 'live'
  const isUpcoming = room.status === 'upcoming'
  const isPrivate = room.visibility === 'private'

  return (
    <Link href={`/xem-chung/${room.code}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151521] shadow-[0_16px_40px_rgba(0,0,0,0.75)] transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[0_22px_60px_rgba(0,0,0,0.95)]">
        <div className="relative aspect-video overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80"
            alt={room.roomName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />

          <div className="absolute top-3 left-3 flex items-center gap-2">
            {isLive && (
              <Badge className="bg-red-600 text-white border-red-500 shadow-sm">LIVE</Badge>
            )}
            {isUpcoming && !isLive && (
              <Badge className="bg-amber-500 text-black border-amber-400 shadow-sm">
                Sắp diễn ra
              </Badge>
            )}
            {!isLive && !isUpcoming && (
              <Badge className="bg-emerald-600 text-white border-emerald-400 shadow-sm">
                Đang chờ
              </Badge>
            )}
            {room.roomType === 'couple' && (
              <Badge variant="secondary" className="bg-pink-600/80 border-pink-400/80 text-white">
                Couple
              </Badge>
            )}
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end gap-3">
            <div className="space-y-1">
              <p className="text-xs text-white/70 line-clamp-1 flex items-center gap-1">
                <Video className="w-3 h-3" />
                <span>Phim ID: {room.movieId}</span>
              </p>
              <h3 className="text-white font-semibold text-sm md:text-base line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {room.roomName}
              </h3>
              <p className="text-[11px] text-white/70 line-clamp-1">
                Chủ phòng: <span className="font-medium">{room.host.name}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-[11px] text-white/80">
              <div className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 border border-white/20">
                <Users className="w-3 h-3" />
                <span>
                  {memberCount ?? 1}/{room.maxMembers}
                </span>
              </div>
              {isPrivate && (
                <div className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 border border-white/20">
                  <Lock className="w-3 h-3" />
                  <span>Private</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

