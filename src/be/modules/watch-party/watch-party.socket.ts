// ============================================
// Socket.IO Watch Party Server Handler
// ============================================
// Manages room sync: play, pause, seek, sync-time
// Only the host can emit control events

import type { Server, Socket } from 'socket.io'
import { prisma } from '@/lib/db'
import { logger } from '@/src/be/shared/utils/logger'
import { getSocketUser } from '@/src/be/shared/realtime/socket-auth'

const log = logger.child({ module: 'watch-party-socket' })

// ── DB Persist throttle — save state every 5s max per room ──
const lastDbWrite = new Map<string, number>()
const DB_WRITE_INTERVAL = 5000 // 5 seconds

async function persistStateToDB(roomCode: string, playbackTime: number, isPlaying: boolean, lastEventBy: string | null) {
  const now = Date.now()
  const lastWrite = lastDbWrite.get(roomCode) ?? 0

  if (now - lastWrite < DB_WRITE_INTERVAL) return // Throttle
  lastDbWrite.set(roomCode, now)

  try {
    const room = await prisma.watchPartyRoom.findUnique({
      where: { roomCode },
      select: { id: true, status: true },
    })
    if (!room || room.status !== 'ACTIVE') return

    await prisma.watchPartyState.update({
      where: { roomId: room.id },
      data: {
        playbackTime,
        isPlaying,
        lastEventBy,
        lastEventType: 'SYNC',
        version: { increment: 1 },
      },
    })

    await prisma.watchPartyRoom.update({
      where: { roomCode },
      data: { lastSyncedAt: new Date() },
    })
  } catch (err) {
    log.error({ roomCode, err: err instanceof Error ? err.message : err }, 'DB persist error')
  }
}

// ── Types ──

export interface SyncState {
  playbackTime: number
  isPlaying: boolean
  lastEventBy: string | null
  updatedAt: number // timestamp ms
}

interface RoomState {
  hostId: string | null
  hostSocketId: string | null
  state: SyncState
  participants: Map<string, { socketId: string; displayName: string; userId: string }>
}

// ── Room state store (in-memory) ──
const rooms = new Map<string, RoomState>()

function getOrCreateRoom(roomCode: string): RoomState {
  let room = rooms.get(roomCode)
  if (!room) {
    room = {
      hostId: null,
      hostSocketId: null,
      state: {
        playbackTime: 0,
        isPlaying: false,
        lastEventBy: null,
        updatedAt: Date.now(),
      },
      participants: new Map(),
    }
    rooms.set(roomCode, room)
  }
  return room
}

// ── Rate Limiter ──
const rateLimitStore = new Map<string, { count: number; firstRequestTime: number }>()
const RATE_LIMIT_WINDOW = 1000 // 1 second window
const MAX_EVENTS_PER_WINDOW = 20 // 20 events per second max

function checkRateLimit(socketId: string): boolean {
  const now = Date.now()
  let record = rateLimitStore.get(socketId)

  if (!record || now - record.firstRequestTime > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(socketId, { count: 1, firstRequestTime: now })
    return false
  }

  record.count += 1
  if (record.count > MAX_EVENTS_PER_WINDOW) {
    return true // Rate limited
  }

  return false
}

// ── Membership (verified at wp:join) ──
// The client sends its participant id (from the join API) as `userId`. We
// verify it against the DB once at wp:join and remember it per socket; every
// later event acts as that participant, ignoring any ids in the payload.

const MAX_CHAT_LENGTH = 1000

interface Membership {
  participantId: string
  displayName: string
}

function memberships(socket: Socket): Map<string, Membership> {
  if (!socket.data.wpRooms) socket.data.wpRooms = new Map<string, Membership>()
  return socket.data.wpRooms as Map<string, Membership>
}

function membershipOf(socket: Socket, roomCode: unknown): Membership | null {
  if (typeof roomCode !== 'string') return null
  return memberships(socket).get(roomCode) ?? null
}

/** The verified member of `roomCode` — only if they are the current host. */
function hostMembership(socket: Socket, roomCode: unknown): Membership | null {
  const m = membershipOf(socket, roomCode)
  if (!m) return null
  const room = rooms.get(roomCode as string)
  return room && room.hostId === m.participantId ? m : null
}

/**
 * Check the participant exists in an ACTIVE room with this code, has been
 * admitted (not PENDING/REJECTED/left) and — when tied to an account — belongs
 * to the socket's authenticated user.
 */
async function verifyParticipant(socket: Socket, roomCode: string, participantId: string) {
  const participant = await prisma.watchPartyParticipant.findUnique({
    where: { id: participantId },
    select: {
      id: true, userId: true, displayName: true, role: true, status: true, leftAt: true,
      room: { select: { roomCode: true, status: true } },
    },
  })
  if (!participant || participant.room.roomCode !== roomCode || participant.room.status !== 'ACTIVE') return null
  if (participant.status !== 'ACTIVE' || participant.leftAt) return null
  if (participant.userId && participant.userId !== getSocketUser(socket)?.id) return null
  return participant
}

// ── Socket event handler ──

export function registerWatchPartyHandlers(io: Server, socket: Socket) {
  // Rate Limiter Middleware
  socket.use((packet, next) => {
    // We can exclude certain events from rate limiting if needed, e.g. disconnect
    if (checkRateLimit(socket.id)) {
      log.warn({ socketId: socket.id, event: packet[0] }, 'Rate limit exceeded')
      socket.emit('wp:error', { message: 'Gửi quá nhiều yêu cầu, vui lòng chậm lại' })
      return next(new Error('Rate limit exceeded'))
    }
    next()
  })

  // ───────────────────────────────────
  // JOIN ROOM
  // ───────────────────────────────────
  socket.on('wp:join', async (data: { roomCode: string; userId: string }) => {
    if (!data || typeof data.roomCode !== 'string' || typeof data.userId !== 'string') return
    const roomCode = data.roomCode
    const participant = await verifyParticipant(socket, roomCode, data.userId)
    if (!participant) {
      socket.emit('wp:error', { message: 'Bạn chưa được tham gia phòng này' })
      return
    }

    const userId = participant.id
    const displayName = participant.displayName
    const isHost = participant.role === 'HOST'
    const room = getOrCreateRoom(roomCode)
    memberships(socket).set(roomCode, { participantId: userId, displayName })

    // Join socket.io room
    socket.join(roomCode)

    // Register participant
    room.participants.set(userId, {
      socketId: socket.id,
      displayName,
      userId,
    })

    // The DB host always takes control; otherwise the first member present
    // controls playback until the host (re)joins.
    if (isHost || !room.hostId || !room.participants.has(room.hostId)) {
      room.hostId = userId
      room.hostSocketId = socket.id
    }

    log.info({ displayName, roomCode, isHost }, 'User joined room')

    // Send current state to new joiner
    socket.emit('wp:state', {
      ...room.state,
      hostId: room.hostId,
      participantCount: room.participants.size,
    })

    // Notify others
    socket.to(roomCode).emit('wp:user-joined', {
      userId,
      displayName,
      participantCount: room.participants.size,
    })

    // If host is online, request fresh time from host
    if (room.hostSocketId && room.hostSocketId !== socket.id) {
      io.to(room.hostSocketId).emit('wp:request-time')
    }
  })

  // ───────────────────────────────────
  // PLAY / PAUSE / SEEK (host only)
  // ───────────────────────────────────
  function handleControl(kind: 'play' | 'pause' | 'seek', data: { roomCode: string; currentTime: number }) {
    const host = hostMembership(socket, data?.roomCode)
    if (!host) {
      socket.emit('wp:error', { message: 'Chỉ host mới điều khiển được player' })
      return
    }
    if (typeof data.currentTime !== 'number' || !Number.isFinite(data.currentTime) || data.currentTime < 0) return
    const room = rooms.get(data.roomCode)!

    room.state = {
      playbackTime: data.currentTime,
      isPlaying: kind === 'seek' ? room.state.isPlaying : kind === 'play',
      lastEventBy: host.participantId,
      updatedAt: Date.now(),
    }

    // Broadcast to all others in room
    socket.to(data.roomCode).emit(`wp:${kind}`, {
      currentTime: data.currentTime,
      by: host.participantId,
    })
  }

  socket.on('wp:play', (data: { roomCode: string; currentTime: number }) => handleControl('play', data))
  socket.on('wp:pause', (data: { roomCode: string; currentTime: number }) => handleControl('pause', data))
  socket.on('wp:seek', (data: { roomCode: string; currentTime: number }) => handleControl('seek', data))

  // ───────────────────────────────────
  // SYNC-TIME (host responds with current time)
  // ───────────────────────────────────
  socket.on('wp:sync-time', (data: { roomCode: string; currentTime: number; isPlaying: boolean }) => {
    const host = hostMembership(socket, data?.roomCode)
    if (!host) return
    if (typeof data.currentTime !== 'number' || !Number.isFinite(data.currentTime) || data.currentTime < 0) return
    const room = rooms.get(data.roomCode)!

    room.state = {
      playbackTime: data.currentTime,
      isPlaying: !!data.isPlaying,
      lastEventBy: host.participantId,
      updatedAt: Date.now(),
    }

    // Broadcast updated state to everyone in room
    socket.to(data.roomCode).emit('wp:state', {
      ...room.state,
      hostId: room.hostId,
      participantCount: room.participants.size,
    })

    // Persist to DB (throttled: max once per 5s per room)
    persistStateToDB(data.roomCode, data.currentTime, !!data.isPlaying, host.participantId)
  })

  // ───────────────────────────────────
  // CHAT MESSAGE via socket
  // ───────────────────────────────────
  async function persistChat(roomCode: string, member: Membership, content: string) {
    try {
      const dbRoom = await prisma.watchPartyRoom.findUnique({
        where: { roomCode },
        select: { id: true },
      })
      if (dbRoom) {
        await prisma.watchPartyMessage.create({
          data: {
            roomId: dbRoom.id,
            participantId: member.participantId,
            senderName: member.displayName,
            type: 'chat',
            content,
          },
        })
      }
    } catch (err) {
      log.error({ roomCode, err: err instanceof Error ? err.message : err }, 'DB persist message error')
    }
  }

  function readChatContent(content: unknown): string | null {
    if (typeof content !== 'string') return null
    const trimmed = content.trim().slice(0, MAX_CHAT_LENGTH)
    return trimmed.length > 0 ? trimmed : null
  }

  socket.on('wp:chat', async (data: { roomCode: string; content: string }) => {
    const member = membershipOf(socket, data?.roomCode)
    const content = readChatContent(data?.content)
    if (!member || !content) return

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderName: member.displayName,
      senderId: member.participantId,
      type: 'chat',
      content,
      createdAt: new Date().toISOString(),
    }

    // Broadcast to entire room (including sender for confirmation)
    io.in(data.roomCode).emit('wp:chat-message', message)

    // Background push to DB
    await persistChat(data.roomCode, member, content)
  })

  // ───────────────────────────────────
  // CHAT MESSAGE PERSIST ONLY (SFU Mode)
  // ───────────────────────────────────
  socket.on('wp:chat-persist', async (data: { roomCode: string; content: string }) => {
    const member = membershipOf(socket, data?.roomCode)
    const content = readChatContent(data?.content)
    if (!member || !content) return
    await persistChat(data.roomCode, member, content)
  })

  // ───────────────────────────────────
  // CALL SIGNALING (WebRTC)
  // ───────────────────────────────────
  socket.on('wp:call-signal', (data: { roomCode: string; type: string; targetId?: string; payload?: unknown }) => {
    const member = membershipOf(socket, data?.roomCode)
    if (!member) return
    // Sender identity comes from the verified membership, not the payload.
    socket.to(data.roomCode).emit('wp:call-signal', {
      ...data,
      fromId: member.participantId,
      fromName: member.displayName,
    })
  })

  // ───────────────────────────────────
  // ROOM LOCK & APPROVAL (Host Only)
  // ───────────────────────────────────
  socket.on('wp:toggle-lock', async (data: { roomCode: string; isLocked: boolean }) => {
    if (!hostMembership(socket, data?.roomCode)) return

    try {
      await prisma.watchPartyRoom.update({
        where: { roomCode: data.roomCode },
        data: { isLocked: !!data.isLocked },
      })
      io.in(data.roomCode).emit('wp:lock-changed', { isLocked: !!data.isLocked })
    } catch (e) {
      log.error({ err: e instanceof Error ? e.message : e }, 'Toggle lock error')
    }
  })

  socket.on('wp:request-join', (data: { roomCode: string; userId: string; displayName: string }) => {
    if (!data || typeof data.roomCode !== 'string') return
    const room = rooms.get(data.roomCode)
    if (!room || !room.hostSocketId) return
    // Forward request to host; the socket id is taken from the server side.
    io.to(room.hostSocketId).emit('wp:join-request', {
      roomCode: data.roomCode,
      userId: typeof data.userId === 'string' ? data.userId : '',
      displayName: typeof data.displayName === 'string' ? data.displayName.slice(0, 50) : '',
      socketId: socket.id,
    })
  })

  // Approval itself is persisted by the REST approve endpoint; these events
  // only tell the waiting socket to retry its join.
  socket.on('wp:approve-join', (data: { roomCode: string; targetSocketId: string }) => {
    if (!hostMembership(socket, data?.roomCode) || typeof data.targetSocketId !== 'string') return
    io.to(data.targetSocketId).emit('wp:join-approved', { roomCode: data.roomCode })
  })

  socket.on('wp:reject-join', (data: { roomCode: string; targetSocketId: string }) => {
    if (!hostMembership(socket, data?.roomCode) || typeof data.targetSocketId !== 'string') return
    io.to(data.targetSocketId).emit('wp:join-rejected', { roomCode: data.roomCode })
  })

  socket.on('wp:kick', async (data: { roomCode: string; targetId: string }) => {
    if (!hostMembership(socket, data?.roomCode) || typeof data.targetId !== 'string') return
    const room = rooms.get(data.roomCode)!

    const target = room.participants.get(data.targetId)
    if (target && target.socketId !== socket.id) {
      io.to(target.socketId).emit('wp:kicked', { message: 'Bạn đã bị chủ phòng mời ra khỏi phòng.' })
      // Remove the KICKED member's socket from the room (not the host's).
      const targetSocket = io.sockets.sockets.get(target.socketId) ?? null
      if (targetSocket) memberships(targetSocket).delete(data.roomCode)
      handleLeave(data.roomCode, data.targetId, targetSocket)
    }
  })

  // ───────────────────────────────────
  // HOST TRANSFER
  // ───────────────────────────────────
  socket.on('wp:transfer-host', (data: { roomCode: string; newHostId: string }) => {
    // Only current host can transfer
    if (!hostMembership(socket, data?.roomCode) || typeof data.newHostId !== 'string') return
    const room = rooms.get(data.roomCode)!

    const newHost = room.participants.get(data.newHostId)
    if (!newHost) return

    room.hostId = data.newHostId
    room.hostSocketId = newHost.socketId

    io.in(data.roomCode).emit('wp:host-changed', {
      newHostId: data.newHostId,
      newHostName: newHost.displayName,
    })
  })

  // ───────────────────────────────────
  // LEAVE / DISCONNECT
  // ───────────────────────────────────
  /** Remove `userId` from `roomCode`; `memberSocket` is that member's socket (null once disconnected). */
  function handleLeave(roomCode: string, userId: string, memberSocket: Socket | null) {
    const room = rooms.get(roomCode)
    if (!room) return

    const participant = room.participants.get(userId)
    if (!participant) return

    room.participants.delete(userId)

    // Notify the others (not the leaving member)
    io.to(roomCode).except(participant.socketId).emit('wp:user-left', {
      userId,
      displayName: participant.displayName,
      participantCount: room.participants.size,
    })

    if (room.participants.size === 0) {
      // Room empty — full cleanup
      rooms.delete(roomCode)
      lastDbWrite.delete(roomCode)
      log.info({ roomCode }, 'Room deleted (empty)')
    } else if (room.hostId === userId) {
      // Host left — transfer to next participant
      const nextParticipant = room.participants.values().next().value
      if (nextParticipant) {
        room.hostId = nextParticipant.userId
        room.hostSocketId = nextParticipant.socketId

        io.in(roomCode).emit('wp:host-changed', {
          newHostId: nextParticipant.userId,
          newHostName: nextParticipant.displayName,
        })

        log.info({ newHost: nextParticipant.displayName, roomCode }, 'Host transferred')
      }
    }

    memberSocket?.leave(roomCode)
  }

  socket.on('wp:leave', (data: { roomCode: string }) => {
    const member = membershipOf(socket, data?.roomCode)
    if (!member) return
    memberships(socket).delete(data.roomCode)
    handleLeave(data.roomCode, member.participantId, socket)
  })

  socket.on('disconnect', () => {
    // Clear rate limit store
    rateLimitStore.delete(socket.id)

    for (const [roomCode, member] of memberships(socket)) {
      handleLeave(roomCode, member.participantId, null)
    }
    memberships(socket).clear()
  })
}
