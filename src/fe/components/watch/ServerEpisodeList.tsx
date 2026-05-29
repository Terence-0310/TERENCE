'use client'

import { useState, useMemo, useEffect } from 'react'
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
    return providerEps.length > 30 ? (
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {providerEps.map((ep) => {
            const isCurrent = currentEpisodeSlug === ep.slug
            return (
              <Link
                key={ep.slug}
                href={`/watch/${movieId}?ep=${ep.slug}`}
                prefetch={false}
                className={`flex items-center justify-center rounded-lg p-2 text-sm font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
                title={ep.title || `Tập ${ep.number}`}
              >
                {ep.number}
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="flex overflow-x-auto gap-3 pb-4 custom-scrollbar">
          {providerEps.map((ep) => {
            const isCurrent = currentEpisodeSlug === ep.slug
            return (
              <Link
                key={ep.slug}
                href={`/watch/${movieId}?ep=${ep.slug}`}
                prefetch={false}
                className={`group relative flex-shrink-0 flex flex-col gap-2 rounded-xl p-2 transition-all ${
                  isCurrent
                    ? 'bg-primary/10 border border-primary/30 max-w-[200px]'
                    : 'hover:bg-white/5 border border-transparent max-w-[200px]'
                }`}
              >
                <div className="relative h-[80px] w-[142px] overflow-hidden rounded-lg bg-background">
                  <Image 
                    src={backdropUrl} 
                    alt="" 
                    fill 
                    sizes="142px"
                    className={`object-cover transition duration-300 ${isCurrent ? 'opacity-100 scale-105' : 'opacity-70 group-hover:opacity-100 group-hover:scale-105'}`} 
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {isCurrent && <Play className="h-6 w-6 fill-primary text-primary drop-shadow-md" />}
                  </div>
                </div>
                <span className={`text-[13px] font-medium px-1 truncate ${isCurrent ? 'text-primary' : 'text-white/90'}`}>
                  {ep.title || `Tập ${ep.number}`}
                </span>
              </Link>
            )
          })}
        </div>
      )
  }

  // 1. Group DB episodes by serverName
  // Optimize algorithm using simple Dictionary mapping
  const serverGroups = useMemo(() => {
    const dict: Record<string, PlayableEpisode[]> = {}
    for (let i = 0; i < episodeList.length; i++) {
      const ep = episodeList[i]
      const srvName = ep.serverName || 'Máy chủ 1'
      if (!dict[srvName]) dict[srvName] = []
      dict[srvName].push(ep)
    }
    
    return Object.entries(dict).map(([serverName, episodes]) => ({
      serverName,
      // Ensure episodes are sorted properly
      episodes: episodes.sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0))
    }))
  }, [episodeList])

  const [activeServer, setActiveServer] = useState<string>('')
  const [activeChunk, setActiveChunk] = useState<number>(0)

  // 2. Sync state when currentEpisode changes or when initialized
  useEffect(() => {
    if (currentEpisodeId) {
      const ep = episodeList.find(e => e.id === currentEpisodeId)
      if (ep) {
        setActiveServer(ep.serverName || '')
      }
    } else if (currentEpisodeSlug) {
      const ep = episodeList.find(e => e.episodeSlug === currentEpisodeSlug)
      if (ep) {
        setActiveServer(ep.serverName || '')
      }
    } else if (!activeServer && serverGroups.length > 0) {
      setActiveServer(serverGroups[0].serverName)
    }
  }, [currentEpisodeId, currentEpisodeSlug, episodeList, serverGroups, activeServer])

  // Sync chunk when server or current episode changes
  useEffect(() => {
    if (!activeServer) return
    const currentActiveEpisodes = episodeList.filter(ep => ep.serverName === activeServer)
    const currentIdx = currentActiveEpisodes.findIndex(ep => ep.id === currentEpisodeId || ep.episodeSlug === currentEpisodeSlug)
    if (currentIdx >= 0) {
      setActiveChunk(Math.floor(currentIdx / 100))
    } else {
      setActiveChunk(0)
    }
  }, [activeServer, currentEpisodeId, currentEpisodeSlug, episodeList])

  // 3. Render tabs if multiple servers
  const hasMultipleServers = serverGroups.length > 1
  const activeEpisodes = useMemo(() => {
    return serverGroups.find(g => g.serverName === activeServer)?.episodes || []
  }, [serverGroups, activeServer])

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
                    ? 'bg-primary/20 text-primary border-primary/40 shadow-[0_0_15px_rgba(45,212,191,0.1)]' 
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
      {activeEpisodes.length > 100 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Array.from({ length: Math.ceil(activeEpisodes.length / 100) }).map((_, i) => {
            const start = i * 100 + 1
            const end = Math.min((i + 1) * 100, activeEpisodes.length)
            return (
              <button
                key={i}
                onClick={() => setActiveChunk(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeChunk === i 
                    ? 'bg-primary text-white shadow-md' 
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                Tập {start} - {end}
              </button>
            )
          })}
        </div>
      )}

      {activeEpisodes.length > 30 ? (
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {activeEpisodes.slice(activeChunk * 100, (activeChunk + 1) * 100).map((ep) => {
            const slug = ep.episodeSlug || `tap-${ep.episodeNumber}`
            const isCurrent = currentEpisodeId === ep.id
            return (
              <Link
                key={ep.id}
                href={`/watch/${movieSlug}?ep=${slug}`}
                prefetch={false}
                className={`flex items-center justify-center rounded-lg p-2 text-sm font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-primary text-white shadow-[0_0_15px_rgba(45,212,191,0.3)] border border-primary/50'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/[0.04]'
                }`}
                title={ep.episodeName || `Tập ${ep.episodeNumber}`}
              >
                {ep.episodeNumber}
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="flex overflow-x-auto gap-3 pb-4 custom-scrollbar">
          {activeEpisodes.map((ep) => {
            const slug = ep.episodeSlug || `tap-${ep.episodeNumber}`
            const isCurrent = currentEpisodeId === ep.id
            return (
              <Link
                key={ep.id}
                href={`/watch/${movieSlug}?ep=${slug}`}
                prefetch={false}
                className={`group relative flex-shrink-0 flex flex-col gap-2 rounded-xl p-2 transition-all ${
                  isCurrent
                    ? 'bg-primary/10 border border-primary/30 max-w-[200px]'
                    : 'hover:bg-white/5 border border-transparent max-w-[200px]'
                }`}
              >
                <div className="relative h-[80px] w-[142px] overflow-hidden rounded-lg bg-background">
                  {ep.thumbnailUrl || backdropUrl ? (
                    <Image 
                      src={ep.thumbnailUrl || backdropUrl} 
                      alt="" 
                      fill 
                      sizes="142px"
                      className={`object-cover transition duration-300 ${isCurrent ? 'opacity-100 scale-105' : 'opacity-70 group-hover:opacity-100 group-hover:scale-105'}`} 
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Play className="h-6 w-6 text-white/10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {isCurrent && <Play className="h-6 w-6 fill-primary text-primary drop-shadow-md" />}
                  </div>
                </div>
                <span className={`text-[13px] font-medium px-1 truncate ${isCurrent ? 'text-primary' : 'text-white/90'}`}>
                  {ep.episodeName || `Tập ${ep.episodeNumber}`}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
