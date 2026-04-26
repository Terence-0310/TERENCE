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

import { useState, useMemo, useEffect } from 'react'
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

  // Map remote LiveKit streams into CallParticipant arrays
  const participants = useMemo<CallParticipant[]>(() => {
    return livekit.remoteParticipants.map((p) => {
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
      return {
        peerId: p.identity,
        memberId: p.identity,
        memberName: p.name,
        isMuted: p.isMuted,
        isCameraOn: p.isCameraOn,
        stream: hasTracks ? stream : undefined,
      }
    })
  }, [livekit.remoteParticipants])

  return {
    room: livekit.room,
    isInCall,
    isMuted: livekit.isMuted,
    isCameraOn: livekit.isCameraOn,
    localStream,
    participants,
    isCallSupported,
    joinCall: async () => { await livekit.connect(true, roomType !== 'group_chat') },
    leaveCall: livekit.disconnect,
    toggleMic: livekit.toggleMic,
    toggleCamera: livekit.toggleCamera,
    muteAll: livekit.muteAll,
  }
}

