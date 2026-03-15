'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send, Users, Play, Pause, Clock, MessageCircle, Settings, Volume2 } from 'lucide-react'
import Link from 'next/link'
import useSWR from 'swr'
import type { WatchRoom, WatchRoomMember, WatchRoomMessage } from '@/lib/watch-party/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

export default function WatchRoomPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string)?.toUpperCase()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [chatInput, setChatInput] = useState('')
  const [showChat, setShowChat] = useState(true)

  const { data, error, isLoading, mutate } = useSWR<{
    room: WatchRoom
    members: WatchRoomMember[]
    messages: WatchRoomMessage[]
  }>(code ? `/api/watch-rooms/${code}` : null, fetcher, { refreshInterval: 3000 })

  const room = data?.room
  const membersList = data?.members ?? []
  const chatMessages = data?.messages ?? []

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages.length])

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || !code) return

    await fetch(`/api/watch-rooms/${code}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderName: 'Bạn', content: chatInput.trim() }),
    })
    setChatInput('')
    mutate()
  }

  async function handlePlayPause() {
    if (!room || !code) return
    const newState = room.playbackState === 'playing' ? 'paused' : 'playing'
    await fetch(`/api/watch-rooms/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: newState }),
    })
    mutate()
  }

  // Loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/60 text-sm">Đang kết nối phòng...</p>
        </div>
      </main>
    )
  }

  // Room not found
  if (error || !room) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7 text-white/20" />
          </div>
          <h2 className="text-xl font-bold text-white">Không tìm thấy phòng</h2>
          <p className="text-sm text-white/50">
            Mã phòng <span className="font-mono text-primary">{code}</span> không tồn tại hoặc đã đóng.
          </p>
          <Link href="/xem-chung" className="inline-block mt-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition">
            ← Quay lại
          </Link>
        </div>
      </main>
    )
  }

  const onlineCount = membersList.filter(m => m.isOnline).length
  const isLive = room.status === 'live'
  const isPlaying = room.playbackState === 'playing'

  return (
    <main className="min-h-screen bg-[#020617]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-black/40">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/xem-chung')} className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/60 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-white truncate max-w-[300px]">{room.roomName}</h1>
            <p className="text-[11px] text-white/40">
              Chủ phòng: {room.host.name} • Mã: <span className="font-mono text-primary">{code}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLive && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-500/30 px-2.5 py-1 text-[11px] font-medium text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/[0.06] px-2.5 py-1 text-[11px] text-white/60">
            <Users className="w-3 h-3" />
            {onlineCount}/{room.maxMembers}
          </span>
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-2 rounded-lg transition ${showChat ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content: Player + Chat */}
      <div className="flex h-[calc(100vh-49px)]">
        {/* Player area */}
        <div className="flex-1 flex flex-col">
          {/* Video placeholder */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&q=80')] bg-cover bg-center opacity-20" />
            <div className="absolute inset-0 bg-black/60" />

            <div className="relative text-center space-y-4 z-10">
              <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto backdrop-blur-sm">
                {isPlaying ? (
                  <Volume2 className="w-8 h-8 text-primary animate-pulse" />
                ) : (
                  <Play className="w-8 h-8 text-white/80 ml-1" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{room.roomName}</h3>
                <p className="text-xs text-white/40 mt-1">
                  {isPlaying ? 'Đang phát' : room.status === 'upcoming' ? 'Sắp công chiếu' : 'Đang chờ'}
                  {room.currentPlaybackTime > 0 && ` • ${formatTime(room.currentPlaybackTime)}`}
                </p>
              </div>
            </div>
          </div>

          {/* Player controls */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] bg-black/60">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayPause}
                className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/80 transition"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <span className="text-xs font-mono text-white/50">
                {formatTime(room.currentPlaybackTime)}
              </span>
            </div>

            {/* Progress bar placeholder */}
            <div className="flex-1 mx-4">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min((room.currentPlaybackTime / 7200) * 100, 100)}%` }} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-white/30" />
              <span className="text-xs text-white/40 font-mono">2:00:00</span>
            </div>
          </div>
        </div>

        {/* Chat sidebar */}
        {showChat && (
          <div className="w-80 lg:w-96 border-l border-white/[0.06] flex flex-col bg-[#0B1120]">
            {/* Members */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                Thành viên ({onlineCount})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {membersList.map(m => (
                  <span
                    key={m.id}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border ${
                      m.isOnline
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-white/5 border-white/[0.06] text-white/30'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${m.isOnline ? 'bg-primary' : 'bg-white/20'}`} />
                    {m.guestName ?? (m.role === 'host' ? room.host.name : 'User')}
                    {m.role === 'host' && <span className="text-[9px] ml-0.5 opacity-70">👑</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 scrollbar-hide">
              {chatMessages.length === 0 && (
                <p className="text-xs text-white/30 text-center py-8">Chưa có tin nhắn</p>
              )}
              {chatMessages.map(msg => (
                <div key={msg.id}>
                  {msg.type === 'system' ? (
                    <p className="text-[10px] text-white/30 text-center py-1">— {msg.content} —</p>
                  ) : (
                    <div>
                      <span className="text-[11px] font-semibold text-primary">{msg.senderName}</span>
                      <p className="text-xs text-white/70 leading-relaxed">{msg.content}</p>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <form onSubmit={handleSendChat} className="px-3 py-2.5 border-t border-white/[0.06]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary/40 transition"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/20 text-primary flex items-center justify-center hover:bg-primary/30 transition disabled:opacity-30"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
