'use client'

import { createContext, useContext } from 'react'

export interface WatchPartyContextType {
  localPlay: (time: number) => void
  localPause: (time: number) => void
  localSeek: (time: number) => void
}

export const WatchPartyContext = createContext<WatchPartyContextType | null>(null)

export function useWatchPartyContext() {
  return useContext(WatchPartyContext)
}
