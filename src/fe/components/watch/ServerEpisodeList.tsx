'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Play } from 'lucide-react'
import type { PlayableEpisode } from '@/lib/player/types'

interface ServerEpisodeListProps {
  episodeList: PlayableEpisode[]
  providerEps: any[]
  movieSlug: string  
  movieId: string
  backdropUrl: string
  currentEpisodeId?: string | null
  currentEpisodeSlug?: string | null
}

export function ServerEpisodeList({
  episodeList,
  providerEps,
  movieSlug,
  movieId,
  backdropUrl,
  currentEpisodeId,
  currentEpisodeSlug
}: ServerEpisodeListProps) {
  // If we only have legacy provider episodes (no db sources)
  if (episodeList.length === 0 && providerEps.length > 0) {
    return (
      <div className="flex overflow-x-auto gap-3 pb-4 custom-scrollbar">
        {providerEps.map((ep) => {
          const isCurrent = currentEpisodeSlug === ep.slug
          return (
            <Link
              key={ep.slug}
              href={`/watch/${movieId}?ep=${ep.slug}`}
              className={`group relative flex-shrink-0 flex flex-col gap-2 rounded-xl p-2 transition-all ${
                isCurrent
                  ? 'bg-[#31CDB8]/10 border border-[#31CDB8]/30 max-w-[200px]'
                  : 'hover:bg-white/5 border border-transparent max-w-[200px]'
              }`}
            >
              <div className="relative h-[80px] w-[142px] overflow-hidden rounded-lg bg-[#0A0E17]">
                <Image 
                  src={backdropUrl} 
                  alt="" 
                  fill 
                  className={`object-cover transition duration-300 ${isCurrent ? 'opacity-100 scale-105' : 'opacity-70 group-hover:opacity-100 group-hover:scale-105'}`} 
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {isCurrent && <Play className="h-6 w-6 fill-[#31CDB8] text-[#31CDB8] drop-shadow-md" />}
                </div>
              </div>
              <span className={`text-[13px] font-medium px-1 truncate ${isCurrent ? 'text-[#31CDB8]' : 'text-white/90'}`}>
                {ep.title || `Tập ${ep.number}`}
              </span>
            </Link>
          )
        })}
      </div>
    )
  }

  // 1. Group DB episodes by serverName
  // We use useMemo to only group once
  const serverGroups = useMemo(() => {
    const map = new Map<string, PlayableEpisode[]>()
    for (const ep of episodeList) {
      const srvName = ep.serverName || 'Máy chủ 1'
      if (!map.has(srvName)) map.set(srvName, [])
      map.get(srvName)!.push(ep)
    }
    return Array.from(map.entries()).map(([serverName, episodes]) => ({
      serverName,
      episodes
    }))
  }, [episodeList])

  // 2. State for active tab.
  // Default to the server of the currently playing episode.
  const initialActiveServer = useMemo(() => {
    if (currentEpisodeId) {
      const ep = episodeList.find(e => e.id === currentEpisodeId)
      if (ep && ep.serverName) return ep.serverName
    }
    if (serverGroups.length > 0) {
      return serverGroups[0].serverName
    }
    return 'Máy chủ 1'
  }, [currentEpisodeId, episodeList, serverGroups])

  const [activeServer, setActiveServer] = useState<string>(initialActiveServer)

  // 3. Render tabs if multiple servers
  const hasMultipleServers = serverGroups.length > 1
  const activeEpisodes = serverGroups.find(g => g.serverName === activeServer)?.episodes || []

  return (
    <div className="w-full flex-col flex gap-4">
      {hasMultipleServers && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {serverGroups.map(group => {
            const isActive = group.serverName === activeServer
            return (
              <button
                key={group.serverName}
                onClick={() => setActiveServer(group.serverName)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all border ${
                  isActive 
                    ? 'bg-[#31CDB8]/20 text-[#31CDB8] border-[#31CDB8]/40 shadow-[0_0_15px_rgba(49,205,184,0.1)]' 
                    : 'bg-white/5 text-white/50 border-white/[0.04] hover:bg-white/10 hover:text-white/80'
                }`}
              >
                {group.serverName.toUpperCase()}
              </button>
            )
          })}
        </div>
      )}

      {/* Render Episodes for the active server */}
      <div className="flex overflow-x-auto gap-3 pb-4 custom-scrollbar">
        {activeEpisodes.map((ep) => {
          const slug = ep.episodeSlug || `tap-${ep.episodeNumber}`
          const isCurrent = currentEpisodeId === ep.id
          return (
            <Link
              key={ep.id}
              href={`/watch/${movieSlug}?ep=${slug}`}
              className={`group relative flex-shrink-0 flex flex-col gap-2 rounded-xl p-2 transition-all ${
                isCurrent
                  ? 'bg-[#31CDB8]/10 border border-[#31CDB8]/30 max-w-[200px]'
                  : 'hover:bg-white/5 border border-transparent max-w-[200px]'
              }`}
            >
              <div className="relative h-[80px] w-[142px] overflow-hidden rounded-lg bg-[#0A0E17]">
                {ep.thumbnailUrl || backdropUrl ? (
                  <Image 
                    src={ep.thumbnailUrl || backdropUrl} 
                    alt="" 
                    fill 
                    className={`object-cover transition duration-300 ${isCurrent ? 'opacity-100 scale-105' : 'opacity-70 group-hover:opacity-100 group-hover:scale-105'}`} 
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Play className="h-6 w-6 text-white/10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {isCurrent && <Play className="h-6 w-6 fill-[#31CDB8] text-[#31CDB8] drop-shadow-md" />}
                </div>
              </div>
              <span className={`text-[13px] font-medium px-1 truncate ${isCurrent ? 'text-[#31CDB8]' : 'text-white/90'}`}>
                {ep.episodeName || `Tập ${ep.episodeNumber}`}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
