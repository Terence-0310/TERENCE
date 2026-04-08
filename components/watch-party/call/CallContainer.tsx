'use client'

// ============================================
// CallContainer — Orchestrates pre-join & in-call views
// ============================================
// State machine: idle → pre-join → connecting → in-call
// Automatically selects DuoView or GridView based on participant count.
// Integrates with usePartyCall hook for WebRTC/LiveKit.

import { useState, useCallback } from 'react'
import { Phone } from 'lucide-react'
import { PreJoinCallScreen } from './PreJoinCallScreen'
import { CallDuoView } from './CallDuoView'
import { CallGridView } from './CallGridView'
import type { UsePartyCallReturn } from '@/hooks/usePartyCall'

type CallStage = 'idle' | 'pre-join' | 'connecting' | 'in-call'

interface CallContainerProps {
  call: UsePartyCallReturn
  userName: string
  roomType: 'duo' | 'small_group' | 'group_chat'
}

export function CallContainer({ call, userName, roomType }: CallContainerProps) {
  const [stage, setStage] = useState<CallStage>(call.isInCall ? 'in-call' : 'idle')

  // Keep stage in sync with call state
  if (call.isInCall && stage !== 'in-call') {
    setStage('in-call')
  }
  if (!call.isInCall && stage === 'in-call') {
    setStage('idle')
  }

  const handleShowPreJoin = useCallback(() => {
    setStage('pre-join')
  }, [])

  const handleCancelPreJoin = useCallback(() => {
    setStage('idle')
  }, [])

  const handleJoin = useCallback(async (settings: { audioEnabled: boolean; videoEnabled: boolean }) => {
    setStage('connecting')
    await call.joinCall()
    // After join, toggle mic/camera to match pre-join settings
    if (!settings.audioEnabled && !call.isMuted) {
      call.toggleMic()
    }
    if (!settings.videoEnabled && call.isCameraOn) {
      call.toggleCamera()
    }
    setStage('in-call')
  }, [call])

  const handleLeave = useCallback(() => {
    call.leaveCall()
    setStage('idle')
  }, [call])

  if (!call.isCallSupported) return null

  // ── Idle: show join button ──
  if (stage === 'idle') {
    return (
      <div className="px-5 py-3 border-b border-white/[0.04]">
        <button
          onClick={handleShowPreJoin}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[14px] bg-gradient-to-r from-[#2DD4BF] to-[#20b2aa] px-4 py-3 text-[13px] font-bold text-[#0A0F1E] shadow-[0_0_20px_rgba(45,212,191,0.3)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(45,212,191,0.5)]"
        >
          {/* Shine effect */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 animate-[shimmer_2s_infinite] group-hover:block" />
          <Phone className="h-4 w-4 drop-shadow-md" />
          <span className="tracking-wide">Tham gia cuộc gọi</span>
        </button>
      </div>
    )
  }

  // ── Pre-join: show preview ──
  if (stage === 'pre-join' || stage === 'connecting') {
    return (
      <div className="border-b border-white/[0.06] p-3">
        <PreJoinCallScreen
          userName={userName}
          onJoin={handleJoin}
          onCancel={handleCancelPreJoin}
          isConnecting={stage === 'connecting'}
        />
      </div>
    )
  }

  // ── In-call ──
  const isDuo = roomType === 'duo' || call.participants.length <= 1

  return (
    <div className="border-b border-white/[0.06] p-2">
      {isDuo ? (
        <CallDuoView
          localUser={{
            name: userName,
            isMuted: call.isMuted,
            isCameraOn: call.isCameraOn,
            stream: call.localStream,
          }}
          remoteUser={
            call.participants[0]
              ? {
                  name: call.participants[0].memberName,
                  isMuted: call.participants[0].isMuted,
                  isCameraOn: call.participants[0].isCameraOn,
                  stream: call.participants[0].stream,
                }
              : null
          }
          onToggleMic={call.toggleMic}
          onToggleCamera={call.toggleCamera}
          onLeave={handleLeave}
        />
      ) : (
        <CallGridView
          participants={[
            {
              id: 'local',
              name: userName,
              isMuted: call.isMuted,
              isCameraOn: call.isCameraOn,
              stream: call.localStream,
              isLocal: true,
            },
            ...call.participants.map((p) => ({
              id: p.peerId,
              name: p.memberName,
              isMuted: p.isMuted,
              isCameraOn: p.isCameraOn,
              stream: p.stream,
            })),
          ]}
          onToggleMic={call.toggleMic}
          onToggleCamera={call.toggleCamera}
          onLeave={handleLeave}
          localMuted={call.isMuted}
          localCameraOn={call.isCameraOn}
        />
      )}
    </div>
  )
}
