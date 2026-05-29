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
    <section className="relative w-full overflow-hidden bg-background/80 backdrop-blur-md shadow-2xl flex flex-col border border-white/[0.06] rounded-none sm:rounded-xl md:rounded-2xl">
      {headerArea && (
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-white/[0.06] shrink-0">
          {headerArea}
        </div>
      )}
      {/* 
        Responsive Player Area:
        1. On mobile: standard aspect-video (width: 100%)
        2. On desktop: Limit max-height to fit the viewport vertically without scrolling down,
           while maintaining 16:9 aspect ratio automatically (margin auto to center horizontally).
      */}
      <div className="w-full flex justify-center bg-black rounded-b-inherit relative">
        <div 
          className="relative w-full"
          style={{ 
            aspectRatio: '16/9',
            maxHeight: 'calc(100vh - 140px)',
            maxWidth: 'calc((100vh - 140px) * 16 / 9)'
          }}
        >
          {playerArea}
        </div>
      </div>
    </section>
  )
}
