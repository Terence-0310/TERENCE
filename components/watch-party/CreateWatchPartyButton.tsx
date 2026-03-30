'use client'

// ============================================
// CreateWatchPartyButton — Floating action button on watch page
// ============================================
// Creates a watch party room for the current movie/episode being watched.
// Appears as a floating button on the watch page.

import { useState } from 'react'
import { Users, Loader2 } from 'lucide-react'

interface CreateWatchPartyButtonProps {
  movieId: string
  movieSlug: string
  movieTitle: string
  episodeSlug?: string
  episodeName?: string
  serverIndex?: number
  posterUrl?: string
  /** Called after room is created, with the room code */
  onRoomCreated: (code: string) => void
}

export function CreateWatchPartyButton({
  movieId,
  movieSlug,
  movieTitle,
  episodeSlug,
  episodeName,
  serverIndex = 0,
  posterUrl,
  onRoomCreated,
}: CreateWatchPartyButtonProps) {
  const [isCreating, setIsCreating] = useState(false)

  async function handleCreate() {
    if (isCreating) return
    setIsCreating(true)

    try {
      const res = await fetch('/api/watch-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: `Xem chung: ${movieTitle}`,
          roomType: 'small_group',
          visibility: 'public',
          movieId,
          movieSlug,
          movieTitle,
          episodeId: episodeSlug,
          episodeName,
          serverIndex,
          maxMembers: 4,
          posterUrl,
        }),
      })

      if (!res.ok) {
        console.error('[CreateWatchParty] Failed to create room')
        return
      }

      const data = await res.json()
      if (data.room?.code) {
        onRoomCreated(data.room.code)
      }
    } catch (err) {
      console.error('[CreateWatchParty] Error:', err)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <button
      onClick={handleCreate}
      disabled={isCreating}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-md transition hover:bg-white/15 hover:text-white disabled:opacity-50"
      title="Tạo phòng xem chung"
    >
      {isCreating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Users className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">Xem chung</span>
    </button>
  )
}
