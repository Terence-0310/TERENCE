'use client'

// ============================================
// usePartyCall — WebRTC Voice/Video Call Hook
// ============================================
// Manages peer connections for watch party calls.
// For `duo` rooms: direct P2P connection
// For `small_group` rooms: mesh topology (each peer connects to all others)
//
// Signaling is done via the watch party API (POST signal messages).
// Signaling is executed gracefully via Watch Party WebSocket + LiveKit DataChannels.
// Phase 2 & 3 Completed: Full SFU LiveKit integration for all group calls.

import { useMemo, useRef, useCallback } from 'react'
import { type Room } from 'livekit-client'
import { useLiveKitRoom } from './useLiveKitRoom'
import type { CallParticipant } from '@/lib/watch-party/types'

export interface UsePartyCallOptions {
  roomCode: string | null
  memberId: string
  memberName: string
  roomType: 'duo' | 'small_group' | 'group_chat'
  enabled?: boolean
}

export interface UsePartyCallReturn {
  room: Room | null
  isInCall: boolean
  isMuted: boolean
  isCameraOn: boolean
  localStream: MediaStream | null
  participants: CallParticipant[]
  isCallSupported: boolean
  /** Last LiveKit connection error message (null on success). */
  error: string | null
  joinCall: () => Promise<void>
  leaveCall: () => void
  toggleMic: () => void
  toggleCamera: () => void
  muteAll: () => void
}

export function usePartyCall(options: UsePartyCallOptions): UsePartyCallReturn {
  const { roomCode, memberId, memberName, roomType, enabled = true } = options

  const isCallSupported = enabled && (roomType === 'duo' || roomType === 'small_group' || roomType === 'group_chat')

  const livekit = useLiveKitRoom({
    roomCode,
    userId: memberId,
    userName: memberName,
    enabled: isCallSupported,
  })

  const isInCall = livekit.connectionState === 'connected'

  // Map local LiveKit streams into a MediaStream
  const localStream = useMemo(() => {
    if (!livekit.localParticipant) return null
    const stream = new MediaStream()
    let hasTracks = false
    if (livekit.localParticipant.audioTrack) {
      stream.addTrack(livekit.localParticipant.audioTrack)
      hasTracks = true
    }
    if (livekit.localParticipant.videoTrack) {
      stream.addTrack(livekit.localParticipant.videoTrack)
      hasTracks = true
    }
    return hasTracks ? stream : null
  }, [livekit.localParticipant?.audioTrack, livekit.localParticipant?.videoTrack])

  // Cache MediaStreams to avoid recreating them and causing re-renders/flickering when active speakers change
  const streamCache = useRef<Map<string, { stream: MediaStream; audioId?: string; videoId?: string }>>(new Map())

  // Map remote LiveKit streams into CallParticipant arrays
  const participants = useMemo<CallParticipant[]>(() => {
    return livekit.remoteParticipants.map((p) => {
      const audioId = p.audioTrack?.id
      const videoId = p.videoTrack?.id
      let cached = streamCache.current.get(p.identity)

      if (!cached || cached.audioId !== audioId || cached.videoId !== videoId) {
        const stream = new MediaStream()
        let hasTracks = false
        if (p.audioTrack) {
          stream.addTrack(p.audioTrack)
          hasTracks = true
        }
        if (p.videoTrack) {
          stream.addTrack(p.videoTrack)
          hasTracks = true
        }
        
        if (hasTracks) {
          cached = { stream, audioId, videoId }
          streamCache.current.set(p.identity, cached)
        } else {
          streamCache.current.delete(p.identity)
          cached = undefined
        }
      }

      return {
        peerId: p.identity,
        memberId: p.identity,
        memberName: p.name,
        isMuted: p.isMuted,
        isCameraOn: p.isCameraOn,
        stream: cached?.stream,
      }
    })
  }, [livekit.remoteParticipants])

  const joinCall = useCallback(async () => {
    await livekit.connect(true, roomType !== 'group_chat')
  }, [livekit.connect, roomType])

  return useMemo(() => ({
    room: livekit.room,
    isInCall,
    isMuted: livekit.isMuted,
    isCameraOn: livekit.isCameraOn,
    localStream,
    participants,
    isCallSupported,
    error: livekit.error,
    joinCall,
    leaveCall: livekit.disconnect,
    toggleMic: livekit.toggleMic,
    toggleCamera: livekit.toggleCamera,
    muteAll: livekit.muteAll,
  }), [
    livekit.room,
    isInCall,
    livekit.isMuted,
    livekit.isCameraOn,
    localStream,
    participants,
    isCallSupported,
    livekit.error,
    joinCall,
    livekit.disconnect,
    livekit.toggleMic,
    livekit.toggleCamera,
    livekit.muteAll,
  ])
}

