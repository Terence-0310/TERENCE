'use client'

// ============================================
// CallContainer — Orchestrates pre-join & in-call views
// ============================================
// State machine: idle → pre-join → connecting → in-call
// Automatically selects DuoView or GridView based on participant count.
// Integrates with usePartyCall hook for WebRTC/LiveKit.

import { useState, useCallback, useEffect } from 'react'
import { Phone } from 'lucide-react'
import { toast } from 'sonner'
import { PreJoinCallScreen } from './PreJoinCallScreen'
import { CallDuoView } from './CallDuoView'
import { CallGridView } from './CallGridView'
import type { UsePartyCallReturn } from '@/src/fe/features/watch-party/hooks/usePartyCall'

type CallStage = 'idle' | 'pre-join' | 'connecting' | 'in-call'

interface CallContainerProps {
  call: UsePartyCallReturn
  userName: string
  roomType: 'duo' | 'small_group' | 'group_chat'
}

export function CallContainer({ call, userName, roomType }: CallContainerProps) {
  const [stage, setStage] = useState<CallStage>(call.isInCall ? 'in-call' : 'idle')

  // Sync stage ↔ isInCall in an effect (not during render — that caused stage
  // to flip back to 'idle' immediately if joinCall finished before isInCall
  // flipped true, making the user think they got kicked out).
  useEffect(() => {
    if (call.isInCall) {
      setStage((prev) => (prev === 'in-call' ? prev : 'in-call'))
    } else {
      setStage((prev) => (prev === 'in-call' ? 'idle' : prev))
    }
  }, [call.isInCall])

  const handleShowPreJoin = useCallback(() => {
    setStage('pre-join')
  }, [])

  const handleCancelPreJoin = useCallback(() => {
    setStage('idle')
  }, [])

  const handleJoin = useCallback(async (settings: { audioEnabled: boolean; videoEnabled: boolean }) => {
    setStage('connecting')
    try {
      await call.joinCall()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể kết nối cuộc gọi'
      toast.error(`Không thể vào cuộc gọi: ${msg}`)
      setStage('pre-join')
      return
    }
    if (!settings.audioEnabled && !call.isMuted) {
      call.toggleMic()
    }
    if (!settings.videoEnabled && call.isCameraOn) {
      call.toggleCamera()
    }
    // Don't force stage='in-call' here — the useEffect above promotes the
    // stage once call.isInCall flips true. If the connect resolved but the
    // server immediately dropped us, the effect will revert to 'idle' and
    // we'll show the toast below.
  }, [call])

  const handleLeave = useCallback(() => {
    call.leaveCall()
    setStage('idle')
  }, [call])

  // Surface LiveKit errors so a silent failure doesn't look like "kicked out".
  useEffect(() => {
    if (call.error) toast.error(`Lỗi cuộc gọi: ${call.error}`)
  }, [call.error])

  if (!call.isCallSupported) return null

  // ── Idle: show join button ──
  if (stage === 'idle') {
    return (
      <div className="px-5 py-2.5 border-b border-white/[0.04]">
        <button
          onClick={handleShowPreJoin}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-[12px] font-semibold text-primary transition hover:bg-primary/20 hover:border-primary/50"
        >
          <Phone className="h-3.5 w-3.5" />
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
