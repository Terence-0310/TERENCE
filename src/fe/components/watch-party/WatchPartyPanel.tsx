'use client'

// ============================================
// WatchPartyPanel — Overlay panel for watch party
// ============================================
// Slides in from the right side of the watch page.
// Contains: room info with movie poster, call area, chat, members.
// Uses CallContainer for pre-join → in-call flow.

import { useState, useRef, useEffect } from 'react'
import {
  Users, MessageCircle, Send, X, Copy, Check,
  Crown, Lock, Unlock, CheckCircle2, XCircle, ShieldBan
} from 'lucide-react'
import type { WatchRoom, WatchRoomMember, WatchRoomMessage } from '@/lib/watch-party/types'
import type { UsePartyCallReturn } from '@/src/fe/features/watch-party/hooks/usePartyCall'
import { CallContainer } from '@/src/fe/components/watch-party/call/CallContainer'
import { resolveThumbnail } from '@/src/be/modules/news/image-resolver'

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
  onApproveJoin?: (userId: string, targetSocketId: string) => void
  onRejectJoin?: (userId: string, targetSocketId: string) => void
  onKickMember?: (targetId: string) => void
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
  onApproveJoin,
  onRejectJoin,
  onKickMember,
}: WatchPartyPanelProps) {
  const [chatInput, setChatInput] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'members'>('chat')
  const [copied, setCopied] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

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
    const url = `${window.location.origin}/xem-chung/${room.code}`
    navigator.clipboard.writeText(url).then(() => {
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
    <div className="flex h-full w-full flex-col bg-[#0B1120]">
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
        
        {isHost && (
          <button
            onClick={() => onToggleLock?.(!room.isLocked)}
            className={`rounded-lg p-1.5 transition ${room.isLocked ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
            title={room.isLocked ? "Mở khoá phòng" : "Khoá phòng (Cần phê duyệt)"}
          >
            {room.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </button>
        )}

        <button
          onClick={onClose}
          className="ml-1 rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Room Code ── */}
      <div className="border-b border-white/[0.04] px-5 py-3">
        <button
          onClick={handleCopyCode}
          className="group relative flex w-full items-center justify-between overflow-hidden rounded-[14px] bg-gradient-to-r from-[#2DD4BF]/10 to-[#2DD4BF]/[0.02] border border-[#2DD4BF]/20 px-4 py-2.5 transition-all duration-300 hover:border-[#2DD4BF]/40 hover:shadow-[0_0_15px_rgba(45,212,191,0.15)]"
        >
          {/* Subtle animated background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full animate-[shimmer_2s_infinite] group-hover:block hidden" />
          
          <span className="text-[13px] text-white/60 font-medium">
            Mã phòng: <span className="ml-1 font-mono text-[15px] font-bold text-[#2DD4BF] drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]">{room.code}</span>
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/20 backdrop-blur-md border border-white-5">
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-white/50 transition-colors group-hover:text-white" />
            )}
          </div>
        </button>
      </div>

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
              ? 'text-[#2DD4BF]'
              : 'text-white/50 hover:text-white/70'
          }`}
        >
          <MessageCircle className="mr-1.5 inline h-3.5 w-3.5" />
          Chat
          {activeTab === 'chat' && (
            <div className="absolute bottom-0 left-1/2 h-[2px] w-2/3 -translate-x-1/2 bg-[#2DD4BF] rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`relative flex-1 py-3 text-xs font-medium transition ${
            activeTab === 'members'
              ? 'text-[#2DD4BF]'
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
            <div className="absolute bottom-0 left-1/2 h-[2px] w-2/3 -translate-x-1/2 bg-[#2DD4BF] rounded-t-full" />
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
                    <p className="py-1 text-center text-[10px] text-white/25">— {msg.content} —</p>
                  ) : (
                    <div className={`rounded-lg px-3 py-2 ${
                      msg.senderId === userId
                        ? 'ml-6 bg-primary/10 border border-primary/20'
                        : 'mr-6 bg-white/[0.04] border border-white/[0.06]'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-primary/80">{msg.senderName}</span>
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
                  className="flex-1 rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-white/30 transition-all focus:border-[#2DD4BF]/50 focus:bg-white/[0.05] focus:shadow-[0_0_15px_rgba(45,212,191,0.1)]"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-r from-[#2DD4BF]/20 to-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/30 transition-all hover:bg-[#2DD4BF]/30 hover:scale-105 hover:shadow-[0_0_15px_rgba(45,212,191,0.2)] disabled:opacity-30 disabled:hover:scale-100 disabled:hover:shadow-none"
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
               <div className="space-y-2">
                 <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2">Yêu cầu tham gia</h4>
                 {pendingRequests.map(req => (
                   <div key={req.userId} className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/[0.05] px-3 py-2.5">
                     <div className="flex items-center gap-2 max-w-[60%]">
                       <span className="truncate text-[13px] font-medium text-white">{req.displayName}</span>
                     </div>
                     <div className="flex items-center gap-1.5 shrink-0">
                       <button onClick={() => onApproveJoin?.(req.userId, req.socketId)} className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 transition">
                         <CheckCircle2 className="h-4 w-4" />
                       </button>
                       <button onClick={() => onRejectJoin?.(req.userId, req.socketId)} className="p-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/40 transition">
                         <XCircle className="h-4 w-4" />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
            )}
            
            <div className="space-y-1.5">
              {isHost && pendingRequests.length > 0 && <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2 mt-4">Thành viên</h4>}
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 transition hover:bg-white/[0.05] hover:border-white/10 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#2DD4BF]/20 to-[#2DD4BF]/5 text-xs font-bold text-[#2DD4BF] border border-[#2DD4BF]/20 shadow-inner">
                        {(m.guestName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0B1120] ${
                        m.isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-white/20'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-white/90">
                          {m.userId === userId ? 'Bạn' : (m.guestName ?? 'Thành viên')}
                        </span>
                        {m.role === 'host' && (
                          <Crown className="h-3.5 w-3.5 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)] shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] text-white/40 font-medium tracking-wide">
                        {m.isOnline ? 'Đang xem' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  {isHost && m.userId !== userId && m.role !== 'host' && (
                    <button onClick={() => onKickMember?.(m.id)} className="p-1.5 rounded-md text-red-400/0 group-hover:text-red-400/60 hover:!text-red-400 hover:bg-red-500/10 transition shrink-0" title="Mời khỏi phòng">
                      <ShieldBan className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-white/[0.04] p-4 bg-gradient-to-t from-black/40 to-transparent">
        <button
          onClick={onLeave}
          className="group relative w-full overflow-hidden rounded-[14px] border border-red-500/30 bg-red-500/10 py-3 text-[13px] font-bold text-red-500 transition hover:border-red-500/50 hover:bg-red-500/20 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
        >
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-red-500/10 to-transparent skew-x-12 transition-transform duration-700 ease-out group-hover:translate-x-full" />
          Rời khỏi phòng
        </button>
      </div>
    </div>
  )
}
