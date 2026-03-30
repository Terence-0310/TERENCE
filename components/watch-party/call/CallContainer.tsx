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
      <div className="px-4 py-2.5 border-b border-white/[0.06]">
        <button
          onClick={handleShowPreJoin}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20"
        >
          <Phone className="h-4 w-4" />
          Tham gia cuộc gọi
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
