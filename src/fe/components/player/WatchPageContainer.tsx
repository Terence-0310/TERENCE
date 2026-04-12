'use client'

import { ReactNode } from 'react'

interface WatchPageContainerProps {
  headerArea?: ReactNode
  playerArea: ReactNode
}

export function WatchPageContainer({
  headerArea,
  playerArea,
}: WatchPageContainerProps) {
  return (
    <section className="relative w-full rounded-xl md:rounded-2xl overflow-hidden bg-[#0A0E17]/80 backdrop-blur-md shadow-2xl flex flex-col border border-white/[0.06]">
      {headerArea && (
        <div className="px-4 py-4 md:px-6 border-b border-white/[0.06]">
          {headerArea}
        </div>
      )}
      <div className="w-full relative aspect-video bg-black rounded-b-inherit">
        {playerArea}
      </div>
    </section>
  )
}
