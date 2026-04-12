'use client'

// ============================================
// useLiveKitRoom — LiveKit Room Hook
// ============================================
// Manages LiveKit room connection, tracks, and participants.
// Fetches token from server-side route, connects to LiveKit Cloud.
// Clean disconnect on unmount.

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  LocalParticipant,
  ConnectionState,
  type Participant,
} from 'livekit-client'

export interface LiveKitParticipant {
  identity: string
  name: string
  isSpeaking: boolean
  isMuted: boolean
  isCameraOn: boolean
  audioTrack?: MediaStreamTrack
  videoTrack?: MediaStreamTrack
}

export interface UseLiveKitRoomOptions {
  /** Room code for the watch party */
  roomCode: string | null
  /** User display name */
  userName: string
  /** User ID */
  userId: string
  /** Whether to enable LiveKit */
  enabled?: boolean
}

export interface UseLiveKitRoomReturn {
  // State
  connectionState: 'disconnected' | 'connecting' | 'connected'
  localParticipant: LiveKitParticipant | null
  remoteParticipants: LiveKitParticipant[]
  isMuted: boolean
  isCameraOn: boolean
  error: string | null

  // Actions
  connect: (audio?: boolean, video?: boolean) => Promise<void>
  disconnect: () => void
  toggleMic: () => void
  toggleCamera: () => void
}

export function useLiveKitRoom(options: UseLiveKitRoomOptions): UseLiveKitRoomReturn {
  const { roomCode, userName, userId, enabled = true } = options

  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [remoteParticipants, setRemoteParticipants] = useState<LiveKitParticipant[]>([])
  const [localParticipant, setLocalParticipant] = useState<LiveKitParticipant | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roomRef = useRef<Room | null>(null)

  // Update participant info helper
  const mapParticipant = useCallback((p: Participant): LiveKitParticipant => {
    let audioTrack: MediaStreamTrack | undefined
    let videoTrack: MediaStreamTrack | undefined
    let hasMic = false
    let hasCam = false

    p.trackPublications.forEach((pub) => {
      if (pub.track) {
        if (pub.track.kind === Track.Kind.Audio) {
          audioTrack = pub.track.mediaStreamTrack
          hasMic = !pub.isMuted
        }
        if (pub.track.kind === Track.Kind.Video && pub.source === Track.Source.Camera) {
          videoTrack = pub.track.mediaStreamTrack
          hasCam = !pub.isMuted
        }
      }
    })

    return {
      identity: p.identity,
      name: p.name || p.identity,
      isSpeaking: p.isSpeaking,
      isMuted: !hasMic,
      isCameraOn: hasCam,
      audioTrack,
      videoTrack,
    }
  }, [])

  const updateRemoteParticipants = useCallback(() => {
    const room = roomRef.current
    if (!room) return
    const participants: LiveKitParticipant[] = []
    room.remoteParticipants.forEach((p) => {
      participants.push(mapParticipant(p))
    })
    setRemoteParticipants(participants)
  }, [mapParticipant])

  const updateLocalParticipant = useCallback(() => {
    const room = roomRef.current
    if (!room) return
    setLocalParticipant(mapParticipant(room.localParticipant))
  }, [mapParticipant])

  // Connect to LiveKit
  const connect = useCallback(async (audio = true, video = true) => {
    if (!roomCode || !enabled) return
    if (roomRef.current) return // Already connected

    setConnectionState('connecting')
    setError(null)

    try {
      // Fetch token from server
      const tokenRes = await fetch(
        `/api/livekit/token?roomId=${encodeURIComponent(roomCode)}&username=${encodeURIComponent(userName)}&identity=${encodeURIComponent(userId)}`,
      )

      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to get token')
      }

      const { token, wsUrl } = await tokenRes.json()

      if (!wsUrl || !token) {
        throw new Error('LiveKit not configured')
      }

      // Create and connect room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      })

      roomRef.current = room

      // Setup event listeners
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === ConnectionState.Connected) {
          setConnectionState('connected')
          updateLocalParticipant()
          updateRemoteParticipants()
        } else if (state === ConnectionState.Disconnected) {
          setConnectionState('disconnected')
        } else if (state === ConnectionState.Reconnecting) {
          setConnectionState('connecting')
        }
      })

      room.on(RoomEvent.ParticipantConnected, () => {
        updateRemoteParticipants()
      })

      room.on(RoomEvent.ParticipantDisconnected, () => {
        updateRemoteParticipants()
      })

      room.on(RoomEvent.TrackSubscribed, () => {
        updateRemoteParticipants()
      })

      room.on(RoomEvent.TrackUnsubscribed, () => {
        updateRemoteParticipants()
      })

      room.on(RoomEvent.TrackMuted, () => {
        updateRemoteParticipants()
        updateLocalParticipant()
      })

      room.on(RoomEvent.TrackUnmuted, () => {
        updateRemoteParticipants()
        updateLocalParticipant()
      })

      room.on(RoomEvent.ActiveSpeakersChanged, () => {
        updateRemoteParticipants()
        updateLocalParticipant()
      })

      room.on(RoomEvent.LocalTrackPublished, () => {
        updateLocalParticipant()
      })

      room.on(RoomEvent.LocalTrackUnpublished, () => {
        updateLocalParticipant()
      })

      room.on(RoomEvent.Disconnected, () => {
        setConnectionState('disconnected')
        setRemoteParticipants([])
        setLocalParticipant(null)
        roomRef.current = null
      })

      // Connect
      await room.connect(wsUrl, token)

      // Publish local tracks
      try {
        if (audio) {
          await room.localParticipant.setMicrophoneEnabled(true)
          setIsMuted(false)
        }
      } catch {
        // Mic not available
        setIsMuted(true)
      }

      try {
        if (video) {
          await room.localParticipant.setCameraEnabled(true)
          setIsCameraOn(true)
        }
      } catch {
        // Camera not available
        setIsCameraOn(false)
      }

      setConnectionState('connected')
      updateLocalParticipant()
    } catch (err: unknown) {
      console.error('[useLiveKitRoom] Connect error:', err)
      const message = err instanceof Error ? err.message : 'Connection failed'
      setError(message)
      setConnectionState('disconnected')
      roomRef.current = null
    }
  }, [roomCode, userName, userId, enabled, updateLocalParticipant, updateRemoteParticipants])

  // Disconnect
  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect()
      roomRef.current = null
    }
    setConnectionState('disconnected')
    setRemoteParticipants([])
    setLocalParticipant(null)
    setIsMuted(false)
    setIsCameraOn(false)
    setError(null)
  }, [])

  // Toggle mic
  const toggleMic = useCallback(async () => {
    const room = roomRef.current
    if (!room) return

    const newMuted = !isMuted
    try {
      await room.localParticipant.setMicrophoneEnabled(!newMuted)
      setIsMuted(newMuted)
      updateLocalParticipant()
    } catch {
      // Failed to toggle
    }
  }, [isMuted, updateLocalParticipant])

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    const room = roomRef.current
    if (!room) return

    const newCameraOn = !isCameraOn
    try {
      await room.localParticipant.setCameraEnabled(newCameraOn)
      setIsCameraOn(newCameraOn)
      updateLocalParticipant()
    } catch {
      // Failed to toggle
    }
  }, [isCameraOn, updateLocalParticipant])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect()
        roomRef.current = null
      }
    }
  }, [])

  return {
    connectionState,
    localParticipant,
    remoteParticipants,
    isMuted,
    isCameraOn,
    error,
    connect,
    disconnect,
    toggleMic,
    toggleCamera,
  }
}
