'use client'

// ============================================
// WatchPartyPanel — Overlay panel for watch party
// ============================================
// Slides in from the right side of the watch page.
// Contains: room info with movie poster, call area, chat, members.
// Uses CallContainer for pre-join → in-call flow.

import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import {
  Users, MessageCircle, Send, X, Copy, Check,
  Crown, Lock, Unlock, MicOff, ShieldBan, BadgeCheck, Palette
} from 'lucide-react'
import type { WatchRoom, WatchRoomMember, WatchRoomMessage } from '@/lib/watch-party/types'
import type { UsePartyCallReturn } from '@/src/fe/features/watch-party/hooks/usePartyCall'
import { CallContainer } from '@/src/fe/components/watch-party/call/CallContainer'
import { HostApprovalList } from '@/src/fe/components/watch-party/HostApprovalList'
import { resolveThumbnail } from '@/src/be/modules/news/image-resolver'
import { Switch } from '@/src/fe/components/ui/switch'
import { UserAvatar } from '@/src/fe/components/shared/UserAvatar'
import { ROOM_THEMES, getRoomTheme } from '@/lib/watch-party/themes'

// ── Props ──

interface WatchPartyPanelProps {
  room: WatchRoom
  members: WatchRoomMember[]
  messages: WatchRoomMessage[]
  isHost: boolean
  userId: string
  userName?: string
  onSendChat: (text: string) => void
  onLeave: () => void
  onClose: () => void
  call: UsePartyCallReturn

  // New features
  pendingRequests?: {userId: string; displayName: string; socketId: string}[]
  onToggleLock?: (locked: boolean) => void
  onSetTheme?: (theme: string) => void
  onApproveJoin?: (userId: string, targetSocketId: string) => void
  onRejectJoin?: (userId: string, targetSocketId: string) => void
  onKickMember?: (targetId: string) => void
  onUpdateRole?: (targetId: string, role: 'COHOST' | 'MEMBER') => void
}

// ── Component ──

export function WatchPartyPanel({
  room,
  members,
  messages,
  isHost,
  userId,
  userName = 'Khách',
  onSendChat,
  onLeave,
  onClose,
  call,
  pendingRequests = [],
  onToggleLock,
  onSetTheme,
  onApproveJoin,
  onRejectJoin,
  onKickMember,
  onUpdateRole,
}: WatchPartyPanelProps) {
  const [chatInput, setChatInput] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'members'>('chat')
  const [copied, setCopied] = useState(false)
  const [showThemes, setShowThemes] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Host's TCoin room-theme perk — gates the theme picker.
  const { data: perkData } = useSWR(
    isHost ? '/api/tcoin/my-perks' : null,
    (url: string) => fetch(url).then((r) => r.json()),
  )
  const canUseRoomTheme = !!perkData?.data?.roomThemeActive

  // Applied room theme + a lookup so chat can show each sender's perks.
  const theme = getRoomTheme(room.theme)
  const memberById = new Map(members.map((m) => [m.id, m]))

  // Auto-scroll chat safely without hijacking main window scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages.length])

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim()) return
    onSendChat(chatInput)
    setChatInput('')
  }

  function handleCopyCode() {
    // Copy ONLY the room code so the user can paste it straight into the
    // "Vào phòng" input. The full share URL has its own dedicated button
    // (or can be reconstructed by appending the code to /xem-chung/).
    navigator.clipboard.writeText(room.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const onlineCount = members.filter((m) => m.isOnline).length

  const roomTypeLabel = {
    duo: 'Couple',
    small_group: 'Nhóm nhỏ',
    group_chat: 'Nhóm lớn',
  }[room.roomType]

  // Resolve movie thumbnail for header
  const movieThumb = resolveThumbnail({ directUrl: room.posterUrl })

  return (
    <div className="flex h-full w-full flex-col bg-background" style={theme.panelStyle}>
      {/* ── Header with movie info ── */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        {/* Movie poster mini */}
        {movieThumb && movieThumb !== '/placeholder.jpg' && (
          <img
            src={movieThumb}
            alt={room.movieTitle || ''}
            className="h-12 w-9 rounded object-cover border border-white/10 shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-white">{room.roomName}</h3>
          {room.movieTitle && (
            <p className="truncate text-[10px] text-primary/70">{room.movieTitle}</p>
          )}
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/50">
            <span>{roomTypeLabel}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {onlineCount}/{room.maxMembers}
            </span>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="ml-1 rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Room Code ── */}
      <div className="border-b border-white/[0.04] px-5 py-2.5">
        <button
          onClick={handleCopyCode}
          className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left transition hover:border-primary/30 hover:bg-white/[0.04]"
        >
          <span className="text-[11px] uppercase tracking-wider text-white/40">Mã phòng</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] font-bold tracking-wider text-primary">{room.code}</span>
            {copied
              ? <Check className="h-3.5 w-3.5 text-emerald-400" />
              : <Copy className="h-3.5 w-3.5 text-white/40" />}
          </div>
        </button>
      </div>

      {/* ── Room Settings (Host Only) ── */}
      {isHost && (
        <div className="border-b border-white/[0.04] px-5 py-3 flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-colors duration-300 ${room.isLocked ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
              {room.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-[13px] font-bold text-white/90">Phòng riêng tư</p>
              <p className="text-[11px] text-white/50">{room.isLocked ? 'Chỉ người được duyệt mới có thể vào' : 'Ai có mã phòng cũng có thể vào'}</p>
            </div>
          </div>
          <Switch
            checked={room.isLocked}
            onCheckedChange={(checked) => onToggleLock?.(checked)}
            className={room.isLocked ? "data-[state=checked]:bg-red-500" : "data-[state=unchecked]:bg-white/20"}
          />
        </div>
      )}

      {/* ── Room Theme (Host Only — TCoin perk) ── */}
      {isHost && (
        <div className="border-b border-white/[0.04] px-5 py-3 bg-white/[0.01]">
          <button
            onClick={() => setShowThemes((v) => !v)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <Palette className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-bold text-white/90">Theme phòng</p>
                <p className="text-[11px] text-white/50">{getRoomTheme(room.theme).name}</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-primary">{showThemes ? 'Đóng' : 'Đổi'}</span>
          </button>
          {showThemes && (
            <div className="mt-3">
              {!canUseRoomTheme ? (
                <p className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-[11px] leading-snug text-white/50">
                  Đổi ưu đãi <span className="font-semibold text-primary">“Theme phòng xem chung” (80 TCoin)</span> trong trang TCoin để tuỳ chỉnh giao diện phòng.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ROOM_THEMES.map((t) => {
                    const active = (room.theme || 'default') === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => onSetTheme?.(t.id)}
                        title={t.name}
                        className={`h-9 w-9 rounded-lg border-2 transition ${active ? 'border-primary scale-110' : 'border-white/10 hover:border-white/30'}`}
                        style={t.id === 'default'
                          ? { background: 'repeating-conic-gradient(#1f2937 0% 25%, #111827 0% 50%) 50% / 10px 10px' }
                          : t.panelStyle}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Call Container (pre-join → in-call) ── */}
      <CallContainer
        call={call}
        userName={userName}
        roomType={room.roomType}
      />

      {/* ── Tab Switcher ── */}
      <div className="flex border-b border-white/[0.06] px-2">
        <button
          onClick={() => setActiveTab('chat')}
          className={`relative flex-1 py-3 text-xs font-medium transition ${
            activeTab === 'chat'
              ? 'text-primary'
              : 'text-white/50 hover:text-white/70'
          }`}
        >
          <MessageCircle className="mr-1.5 inline h-3.5 w-3.5" />
          Chat
          {activeTab === 'chat' && (
            <div className="absolute bottom-0 left-1/2 h-[2px] w-2/3 -translate-x-1/2 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`relative flex-1 py-3 text-xs font-medium transition ${
            activeTab === 'members'
              ? 'text-primary'
              : 'text-white/50 hover:text-white/70'
          }`}
        >
          <Users className="mr-1.5 inline h-3.5 w-3.5" />
          Thành viên ({onlineCount})
          {pendingRequests.length > 0 && isHost && (
            <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {pendingRequests.length}
            </span>
          )}
          {activeTab === 'members' && (
            <div className="absolute bottom-0 left-1/2 h-[2px] w-2/3 -translate-x-1/2 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? (
          <div className="flex h-full flex-col">
            {/* Messages */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-hide scroll-smooth">
              {messages.length === 0 && (
                <p className="py-8 text-center text-xs text-white/25">Chưa có tin nhắn. Hãy bắt đầu trò chuyện!</p>
              )}
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.type === 'system' ? (
                    <div className="flex justify-center my-3">
                       <span className="rounded-full bg-white/[0.03] border border-white/[0.08] px-3 py-1 text-[10px] font-medium text-white/50 backdrop-blur-sm">
                         {msg.content}
                       </span>
                    </div>
                  ) : (
                    <div className={`rounded-lg px-3 py-2 ${
                      msg.senderId === userId
                        ? 'ml-6 bg-primary/10 border border-primary/20'
                        : 'mr-6 bg-white/[0.04] border border-white/[0.06]'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-primary/80">
                          {msg.senderName}
                          {(msg.senderId && memberById.get(msg.senderId)?.badgeActive) && (
                            <span title="Huy hiệu đặc biệt">
                              <BadgeCheck className="h-3 w-3 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]" />
                            </span>
                          )}
                        </span>
                        <span className="text-[9px] text-white/20">
                          {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-white/70">{msg.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="border-t border-white/[0.04] p-3 bg-gradient-to-b from-transparent to-black/20">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-white/30 transition-all focus:border-primary/50 focus:bg-white/[0.05] focus:shadow-[0_0_15px_rgba(45,212,191,0.1)]"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30 transition-all hover:bg-primary/30 hover:scale-105 hover:shadow-[0_0_15px_rgba(45,212,191,0.2)] disabled:opacity-30 disabled:hover:scale-100 disabled:hover:shadow-none"
                >
                  <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Members tab */
          <div className="overflow-y-auto px-4 py-3 space-y-4 scrollbar-hide">
            {isHost && pendingRequests.length > 0 && (
              <HostApprovalList 
                requests={pendingRequests}
                onApprove={onApproveJoin}
                onReject={onRejectJoin}
              />
            )}
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between mb-2 mt-4">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                  Thành viên
                </h4>
                {isHost && (
                  <button
                    onClick={() => call.muteAll()}
                    className="flex items-center gap-1.5 rounded-md bg-white/[0.05] border border-white/[0.05] px-2 py-1 text-[10px] font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
                    title="Tắt mic toàn bộ thành viên trong phòng"
                  >
                    <MicOff className="h-3 w-3" />
                    Tắt mic tất cả
                  </button>
                )}
              </div>
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 transition hover:bg-white/[0.05] hover:border-white/10 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <UserAvatar
                        src={m.avatar}
                        name={m.guestName}
                        frameActive={m.frameActive}
                        badgeActive={m.badgeActive}
                        className="h-9 w-9 text-xs"
                      />
                      <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-border ${
                        m.isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-white/20'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-white/90">
                          {m.userId === userId ? 'Bạn' : (m.guestName ?? 'Thành viên')}
                        </span>
                        {m.role?.toUpperCase() === 'HOST' && (
                          <span title="Host"><Crown className="h-3.5 w-3.5 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)] shrink-0" /></span>
                        )}
                        {m.role?.toUpperCase() === 'COHOST' && (
                          <span title="Co-host"><Crown className="h-3.5 w-3.5 text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)] shrink-0" /></span>
                        )}
                      </div>
                      <span className="text-[11px] text-white/40 font-medium tracking-wide">
                        {m.isOnline ? 'Đang xem' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  {isHost && m.userId !== userId && m.role?.toUpperCase() !== 'HOST' && (
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {m.role?.toUpperCase() === 'COHOST' ? (
                        <button onClick={() => onUpdateRole?.(m.id, 'MEMBER')} className="p-1.5 rounded-md text-blue-400 hover:bg-blue-500/10 transition" title="Hạ xuống Member">
                          <span className="text-[10px] font-bold">−</span>
                        </button>
                      ) : (
                        <button onClick={() => onUpdateRole?.(m.id, 'COHOST')} className="p-1.5 rounded-md text-blue-400 hover:bg-blue-500/10 transition" title="Thăng cấp Co-host">
                          <span className="text-[10px] font-bold">+</span>
                        </button>
                      )}
                      <button onClick={() => onKickMember?.(m.id)} className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition" title="Mời khỏi phòng">
                        <ShieldBan className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-white/[0.04] px-4 py-3">
        <button
          onClick={onLeave}
          className="w-full rounded-lg border border-red-500/20 bg-red-500/5 py-2 text-[12px] font-semibold text-red-400/90 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
        >
          Rời khỏi phòng
        </button>
      </div>
    </div>
  )
}
