import { redirect } from 'next/navigation'
import { prisma } from '@/src/be/shared/db/prisma'

interface PageProps {
  params: Promise<{ code: string }>
}

export default async function WatchRoomRedirectPage({ params }: PageProps) {
  const { code: rawCode } = await params
  const code = rawCode.toUpperCase()

  const room = await prisma.watchPartyRoom.findUnique({
    where: { roomCode: code },
    include: {
      movie: { select: { slug: true } },
      episode: { select: { episodeSlug: true, episodeNumber: true } }
    }
  })

  // 1. Not found -> back to listings
  if (!room) {
    redirect('/xem-chung?error=not-found')
  }

  // 2. Room without a linked DB movie (Legacy TMDB source scenario) -> back to listings
  if (!room.movie || !room.movieId) {
    redirect('/xem-chung?error=invalid-room')
  }

  // 3. Perfect! We have the slug. Redirect to the unified Watch UI.
  // The unified Watch UI uses WatchPartyOverlay which intercepts ?room=CODE
  const epSlug = room.episode?.episodeSlug || `tap-${room.episode?.episodeNumber || 1}`
  redirect(`/watch/${room.movie.slug}?ep=${epSlug}&room=${code}`)
}
