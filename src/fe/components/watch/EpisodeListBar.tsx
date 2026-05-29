'use client'

// ============================================
// EpisodeListBar — episode navigation for TV series watch page
// Fits inside the existing watch page layout between player and info bar
// ============================================

import React from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Play, Clock } from 'lucide-react'
import type { SeriesEpisode, Season } from '@/types/series'
import type { Episode } from '@/types/movie'

interface EpisodeListBarProps {
  // Provider-based episodes (from MovieSourceResult — demo provider etc.)
  providerEpisodes?: Episode[]
  // TMDB-based episodes (from SeasonDetail — richer data)
  seriesEpisodes?: SeriesEpisode[]
  seasons?: Season[]
  currentEpisodeSlug?: string
  watchUrl: string // e.g. "/watch/12345"
  activeSeason?: number
}

export function EpisodeListBar({
  providerEpisodes,
  seriesEpisodes,
  seasons,
  currentEpisodeSlug,
  watchUrl = '',
  activeSeason,
}: EpisodeListBarProps) {
  const [activeChunk, setActiveChunk] = React.useState(0)

  // Determine which episode list to use (TMDB series data preferred)
  const episodes: { slug: string; title: string; number: number; duration?: string; isCurrent: boolean }[] = []

  if (seriesEpisodes && seriesEpisodes.length > 0) {
    for (const ep of seriesEpisodes) {
      episodes.push({
        slug: ep.slug,
        title: ep.title,
        number: ep.episodeNumber,
        duration: ep.runtimeFormatted || undefined,
        isCurrent: currentEpisodeSlug === ep.slug,
      })
    }
  } else if (providerEpisodes && providerEpisodes.length > 0) {
    for (const ep of providerEpisodes) {
      episodes.push({
        slug: ep.slug,
        title: ep.title,
        number: ep.number,
        duration: ep.duration,
        isCurrent: currentEpisodeSlug === ep.slug,
      })
    }
  }

  React.useEffect(() => {
    const currentIdx = episodes.findIndex(e => e.isCurrent)
    if (currentIdx >= 0) {
      setActiveChunk(Math.floor(currentIdx / 100))
    }
  }, [currentEpisodeSlug, episodes])

  if (episodes.length === 0) return null

  // Find current index for prev/next nav
  const currentIndex = episodes.findIndex(e => e.isCurrent)
  const prevEp = currentIndex > 0 ? episodes[currentIndex - 1] : null
  const nextEp = currentIndex >= 0 && currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : null
  const hasMultipleSeasons = seasons && seasons.length > 1

  return (
    <section className="border-t border-white/[0.04] bg-background">
      <div className="mx-auto max-w-7xl px-5 py-4 md:px-8 lg:px-10">
        {/* Header row: title + prev/next */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">
              Danh sách tập
            </h3>

            {/* Season selector — only if multiple seasons */}
            {hasMultipleSeasons && (
              <div className="flex items-center gap-1">
                {seasons!.map(s => (
                  <Link
                    key={s.seasonNumber}
                    href={`${watchUrl}?season=${s.seasonNumber}`}
                    className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
                      activeSeason === s.seasonNumber
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                    }`}
                  >
                    S{s.seasonNumber}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Prev / Next buttons */}
          {(prevEp || nextEp) && (
            <div className="flex items-center gap-2">
              {prevEp ? (
                <Link
                  href={`${watchUrl}?ep=${prevEp.slug}${activeSeason ? `&season=${activeSeason}` : ''}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/60 border border-white/[0.06] transition hover:bg-white/10 hover:text-white"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Tập trước
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-white/20 cursor-not-allowed">
                  <ChevronLeft className="h-3 w-3" />
                  Tập trước
                </span>
              )}
              {nextEp ? (
                <Link
                  href={`${watchUrl}?ep=${nextEp.slug}${activeSeason ? `&season=${activeSeason}` : ''}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/60 border border-white/[0.06] transition hover:bg-white/10 hover:text-white"
                >
                  Tập sau
                  <ChevronRight className="h-3 w-3" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-white/20 cursor-not-allowed">
                  Tập sau
                  <ChevronRight className="h-3 w-3" />
                </span>
              )}
            </div>
          )}
        </div>

        {/* Episode Chunking (if > 100 episodes) */}
        {episodes.length > 100 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {Array.from({ length: Math.ceil(episodes.length / 100) }).map((_, i) => {
              const start = i * 100 + 1
              const end = Math.min((i + 1) * 100, episodes.length)
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

        {/* Episode grid */}
        <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {episodes.slice(activeChunk * 100, (activeChunk + 1) * 100).map((ep) => (
            <Link
              key={ep.slug}
              href={`${watchUrl}?ep=${ep.slug}${activeSeason ? `&season=${activeSeason}` : ''}`}
              prefetch={false}
              className={`group inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition ${
                ep.isCurrent
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-white/5 text-white/70 border border-white/[0.06] hover:bg-white/10 hover:text-white'
              }`}
            >
              {ep.isCurrent && <Play className="h-3 w-3 fill-white flex-shrink-0" />}
              <span>Tập {ep.number}</span>
              {ep.duration && (
                <span className={`inline-flex items-center gap-0.5 ${ep.isCurrent ? 'text-white/60' : 'text-white/30'}`}>
                  <Clock className="h-2.5 w-2.5" />
                  {ep.duration}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
