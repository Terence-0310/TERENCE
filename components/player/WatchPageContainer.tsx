'use client'

import { useState } from 'react'

interface WatchPageContainerProps {
  playerArea: React.ReactNode
}

export function WatchPageContainer({
  playerArea,
}: WatchPageContainerProps) {
  return (
    <section className="relative w-full rounded-2xl overflow-hidden bg-[#121825] shadow-2xl flex flex-col border border-white/5">
      <div className="w-full relative h-[calc(100vh-140px)] min-h-[500px] border-b border-white/5 bg-black">
        {playerArea}
      </div>
    </section>
  )
}
