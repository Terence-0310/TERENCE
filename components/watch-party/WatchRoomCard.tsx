import Link from 'next/link'
import { Users, Lock, Video, Film } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { WatchRoom } from '@/lib/watch-party/types'
import { resolveCardImage } from '@/lib/news/image-resolver'

type Props = {
  room: WatchRoom
  memberCount?: number
}

export function WatchRoomCard({ room, memberCount }: Props) {
  const isLive = room.status === 'live'
  const isUpcoming = room.status === 'upcoming'
  const isPrivate = room.visibility === 'private'

  // Use movie poster/backdrop instead of generic Unsplash
  const cardImage = resolveCardImage({ directUrl: room.posterUrl })

  return (
    <Link href={`/xem-chung/${room.code}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151521] shadow-[0_16px_40px_rgba(0,0,0,0.75)] transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[0_22px_60px_rgba(0,0,0,0.95)]">
        <div className="relative aspect-video overflow-hidden">
          {cardImage !== '/placeholder.jpg' ? (
            <img
              src={cardImage}
              alt={room.roomName}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-background">
              <Film className="h-12 w-12 text-white/[0.06]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

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
            {room.roomType === 'duo' && (
              <Badge variant="secondary" className="bg-pink-600/80 border-pink-400/80 text-white">
                Couple
              </Badge>
            )}
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end gap-3">
            <div className="space-y-1">
              {room.movieTitle ? (
                <p className="text-xs text-primary/80 line-clamp-1 flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  <span>{room.movieTitle}</span>
                </p>
              ) : (
                <p className="text-xs text-white/70 line-clamp-1 flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  <span>Phim ID: {room.movieId}</span>
                </p>
              )}
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
