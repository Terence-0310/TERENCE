'use client'

// ============================================
// usePartyCall — WebRTC Voice/Video Call Hook
// ============================================
// Manages peer connections for watch party calls.
// For `duo` rooms: direct P2P connection
// For `small_group` rooms: mesh topology (each peer connects to all others)
//
// Signaling is done via the watch party API (POST signal messages).
// 
// TODO Phase 2: Replace API polling signaling with WebSocket/Socket.IO
// TODO Phase 3: Use an SFU (LiveKit/Janus) for group_chat rooms

import { useState, useRef, useCallback, useEffect } from 'react'
import type { CallParticipant } from '@/lib/watch-party/types'

// ── Types ──

export interface UsePartyCallOptions {
  /** Room code */
  roomCode: string | null
  /** Current user's member ID */
  memberId: string
  /** Current user's display name */
  memberName: string
  /** Room type determines call capabilities */
  roomType: 'duo' | 'small_group' | 'group_chat'
  /** Whether call is enabled for this room */
  enabled?: boolean
}

export interface UsePartyCallReturn {
  // State
  isInCall: boolean
  isMuted: boolean
  isCameraOn: boolean
  localStream: MediaStream | null
  participants: CallParticipant[]
  isCallSupported: boolean

  // Actions
  joinCall: () => Promise<void>
  leaveCall: () => void
  toggleMic: () => void
  toggleCamera: () => void
}

// ── STUN/TURN servers ──
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export function usePartyCall(options: UsePartyCallOptions): UsePartyCallReturn {
  const { roomCode, memberId, memberName, roomType, enabled = true } = options

  const [isInCall, setIsInCall] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [participants, setParticipants] = useState<CallParticipant[]>([])

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const broadcastChannel = useRef<BroadcastChannel | null>(null)

  // Call is only supported for duo and small_group
  const isCallSupported = enabled && (roomType === 'duo' || roomType === 'small_group')

  // ── Signaling via BroadcastChannel ──
  // For same-browser testing. In production, use WebSocket signaling.

  useEffect(() => {
    if (!roomCode || !isInCall) return

    try {
      const bc = new BroadcastChannel(`terence:call-signal:${roomCode}`)
      broadcastChannel.current = bc

      bc.onmessage = async (event) => {
        const data = event.data as {
          type: 'offer' | 'answer' | 'ice-candidate' | 'join-call' | 'leave-call'
          fromId: string
          fromName: string
          payload?: unknown
        }

        if (data.fromId === memberId) return

        switch (data.type) {
          case 'join-call':
            await handlePeerJoin(data.fromId, data.fromName)
            break
          case 'offer':
            await handleOffer(data.fromId, data.fromName, data.payload as RTCSessionDescriptionInit)
            break
          case 'answer':
            await handleAnswer(data.fromId, data.payload as RTCSessionDescriptionInit)
            break
          case 'ice-candidate':
            await handleIceCandidate(data.fromId, data.payload as RTCIceCandidateInit)
            break
          case 'leave-call':
            handlePeerLeave(data.fromId)
            break
        }
      }

      return () => {
        bc.close()
        broadcastChannel.current = null
      }
    } catch {
      // BroadcastChannel not available
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, isInCall, memberId])

  // ── Peer Connection Management ──

  function createPeerConnection(peerId: string, peerName: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
      })
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('ice-candidate', peerId, event.candidate.toJSON())
      }
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams
      setParticipants((prev) => {
        const existing = prev.find((p) => p.peerId === peerId)
        if (existing) {
          return prev.map((p) =>
            p.peerId === peerId ? { ...p, stream: remoteStream } : p,
          )
        }
        return [
          ...prev,
          {
            peerId,
            memberId: peerId,
            memberName: peerName,
            isMuted: false,
            isCameraOn: true,
            stream: remoteStream,
          },
        ]
      })
    }

    // Handle connection state
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handlePeerLeave(peerId)
      }
    }

    peerConnections.current.set(peerId, pc)
    return pc
  }

  async function handlePeerJoin(peerId: string, peerName: string) {
    const pc = createPeerConnection(peerId, peerName)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    sendSignal('offer', peerId, pc.localDescription?.toJSON())
  }

  async function handleOffer(peerId: string, peerName: string, offer: RTCSessionDescriptionInit) {
    const pc = createPeerConnection(peerId, peerName)
    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    sendSignal('answer', peerId, pc.localDescription?.toJSON())
  }

  async function handleAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    const pc = peerConnections.current.get(peerId)
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }

  async function handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    const pc = peerConnections.current.get(peerId)
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    }
  }

  function handlePeerLeave(peerId: string) {
    const pc = peerConnections.current.get(peerId)
    if (pc) {
      pc.close()
      peerConnections.current.delete(peerId)
    }
    setParticipants((prev) => prev.filter((p) => p.peerId !== peerId))
  }

  function sendSignal(type: string, _targetId: string, payload?: unknown) {
    // Broadcast signal to all (in production, target specific peer)
    if (broadcastChannel.current) {
      try {
        broadcastChannel.current.postMessage({
          type,
          fromId: memberId,
          fromName: memberName,
          payload,
        })
      } catch {
        // Serialization error
      }
    }
  }

  // ── Public Actions ──

  const joinCall = useCallback(async () => {
    if (!isCallSupported || !roomCode) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: roomType === 'duo' || roomType === 'small_group',
      })

      setLocalStream(stream)
      setIsCameraOn(true)
      setIsMuted(false)
      setIsInCall(true)

      // Notify others
      if (broadcastChannel.current) {
        broadcastChannel.current.postMessage({
          type: 'join-call',
          fromId: memberId,
          fromName: memberName,
        })
      }
    } catch (err) {
      console.error('[usePartyCall] getUserMedia error:', err)
      // Try audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        setLocalStream(audioStream)
        setIsCameraOn(false)
        setIsMuted(false)
        setIsInCall(true)
      } catch {
        console.error('[usePartyCall] No media access available')
      }
    }
  }, [isCallSupported, roomCode, roomType, memberId, memberName])

  const leaveCall = useCallback(() => {
    // Notify peers
    if (broadcastChannel.current) {
      broadcastChannel.current.postMessage({
        type: 'leave-call',
        fromId: memberId,
        fromName: memberName,
      })
    }

    // Close all peer connections
    peerConnections.current.forEach((pc) => pc.close())
    peerConnections.current.clear()

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop())
    }

    setLocalStream(null)
    setIsInCall(false)
    setParticipants([])
    setIsMuted(false)
    setIsCameraOn(false)
  }, [memberId, memberName, localStream])

  const toggleMic = useCallback(() => {
    if (!localStream) return
    const audioTrack = localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setIsMuted(!audioTrack.enabled)
    }
  }, [localStream])

  const toggleCamera = useCallback(() => {
    if (!localStream) return
    const videoTrack = localStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setIsCameraOn(videoTrack.enabled)
    }
  }, [localStream])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      peerConnections.current.forEach((pc) => pc.close())
      peerConnections.current.clear()
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop())
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    isInCall,
    isMuted,
    isCameraOn,
    localStream,
    participants,
    isCallSupported,
    joinCall,
    leaveCall,
    toggleMic,
    toggleCamera,
  }
}
