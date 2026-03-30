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
  Crown,
} from 'lucide-react'
import type { WatchRoom, WatchRoomMember, WatchRoomMessage } from '@/lib/watch-party/types'
import type { UsePartyCallReturn } from '@/hooks/usePartyCall'
import { CallContainer } from '@/components/watch-party/call/CallContainer'
import { resolveThumbnail } from '@/lib/news/image-resolver'

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
}: WatchPartyPanelProps) {
  const [chatInput, setChatInput] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'members'>('chat')
  const [copied, setCopied] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
    duo: '💑 Couple',
    small_group: '👥 Nhóm nhỏ',
    group_chat: '🎬 Nhóm lớn',
  }[room.roomType]

  // Resolve movie thumbnail for header
  const movieThumb = resolveThumbnail({ directUrl: room.posterUrl })

  return (
    <div className="flex h-full w-80 flex-col border-l border-white/[0.06] bg-[#0B1120] lg:w-96">
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
          className="ml-2 rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Room Code ── */}
      <div className="border-b border-white/[0.06] px-4 py-2.5">
        <button
          onClick={handleCopyCode}
          className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs transition hover:bg-white/[0.06]"
        >
          <span className="text-white/50">
            Mã phòng: <span className="font-mono font-bold text-primary">{room.code}</span>
          </span>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-white/30" />
          )}
        </button>
      </div>

      {/* ── Call Container (pre-join → in-call) ── */}
      <CallContainer
        call={call}
        userName={userName}
        roomType={room.roomType}
      />

      {/* ── Tab Switcher ── */}
      <div className="flex border-b border-white/[0.06]">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 px-3 py-2.5 text-xs font-medium transition ${
            activeTab === 'chat'
              ? 'border-b-2 border-primary text-primary'
              : 'text-white/50 hover:text-white/70'
          }`}
        >
          <MessageCircle className="mr-1.5 inline h-3.5 w-3.5" />
          Chat
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 px-3 py-2.5 text-xs font-medium transition ${
            activeTab === 'members'
              ? 'border-b-2 border-primary text-primary'
              : 'text-white/50 hover:text-white/70'
          }`}
        >
          <Users className="mr-1.5 inline h-3.5 w-3.5" />
          Thành viên ({onlineCount})
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? (
          <div className="flex h-full flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-hide">
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
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="border-t border-white/[0.06] px-3 py-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 transition focus:border-primary/40"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/20 text-primary transition hover:bg-primary/30 disabled:opacity-30"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Members tab */
          <div className="overflow-y-auto px-4 py-3 space-y-1.5 scrollbar-hide">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 transition hover:bg-white/[0.05]"
              >
                <div className="relative">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {(m.guestName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0B1120] ${
                    m.isOnline ? 'bg-emerald-400' : 'bg-white/20'
                  }`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-medium text-white/80">
                      {m.userId === userId ? 'Bạn' : (m.guestName ?? 'Thành viên')}
                    </span>
                    {m.role === 'host' && (
                      <Crown className="h-3 w-3 text-amber-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-white/30">
                    {m.isOnline ? 'Đang xem' : 'Offline'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-white/[0.06] px-4 py-2.5">
        <button
          onClick={onLeave}
          className="w-full rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
        >
          Rời phòng
        </button>
      </div>
    </div>
  )
}
