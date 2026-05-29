// ============================================
// Socket.IO Watch Party Server Handler
// ============================================
// Manages room sync: play, pause, seek, sync-time
// Only the host can emit control events

import type { Server, Socket } from 'socket.io'
import { prisma } from '@/lib/db'
import { logger } from '@/src/be/shared/utils/logger'

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
  socket.on('wp:join', (data: {
    roomCode: string
    userId: string
    displayName: string
    isHost: boolean
  }) => {
    const { roomCode, userId, displayName, isHost } = data
    const room = getOrCreateRoom(roomCode)

    // Join socket.io room
    socket.join(roomCode)

    // Register participant
    room.participants.set(userId, {
      socketId: socket.id,
      displayName,
      userId,
    })

    // Set host if needed
    if (isHost || !room.hostId) {
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
  // PLAY (host only)
  // ───────────────────────────────────
  socket.on('wp:play', (data: { roomCode: string; userId: string; currentTime: number }) => {
    const room = rooms.get(data.roomCode)
    if (!room) return

    // Only host can control
    if (room.hostId !== data.userId) {
      socket.emit('wp:error', { message: 'Chỉ host mới điều khiển được player' })
      return
    }

    room.state = {
      playbackTime: data.currentTime,
      isPlaying: true,
      lastEventBy: data.userId,
      updatedAt: Date.now(),
    }

    // Broadcast to all others in room
    socket.to(data.roomCode).emit('wp:play', {
      currentTime: data.currentTime,
      by: data.userId,
    })
  })

  // ───────────────────────────────────
  // PAUSE (host only)
  // ───────────────────────────────────
  socket.on('wp:pause', (data: { roomCode: string; userId: string; currentTime: number }) => {
    const room = rooms.get(data.roomCode)
    if (!room) return

    if (room.hostId !== data.userId) {
      socket.emit('wp:error', { message: 'Chỉ host mới điều khiển được player' })
      return
    }

    room.state = {
      playbackTime: data.currentTime,
      isPlaying: false,
      lastEventBy: data.userId,
      updatedAt: Date.now(),
    }

    socket.to(data.roomCode).emit('wp:pause', {
      currentTime: data.currentTime,
      by: data.userId,
    })
  })

  // ───────────────────────────────────
  // SEEK (host only)
  // ───────────────────────────────────
  socket.on('wp:seek', (data: { roomCode: string; userId: string; currentTime: number }) => {
    const room = rooms.get(data.roomCode)
    if (!room) return

    if (room.hostId !== data.userId) {
      socket.emit('wp:error', { message: 'Chỉ host mới điều khiển được player' })
      return
    }

    room.state = {
      ...room.state,
      playbackTime: data.currentTime,
      lastEventBy: data.userId,
      updatedAt: Date.now(),
    }

    socket.to(data.roomCode).emit('wp:seek', {
      currentTime: data.currentTime,
      by: data.userId,
    })
  })

  // ───────────────────────────────────
  // SYNC-TIME (host responds with current time)
  // ───────────────────────────────────
  socket.on('wp:sync-time', (data: { roomCode: string; userId: string; currentTime: number; isPlaying: boolean }) => {
    const room = rooms.get(data.roomCode)
    if (!room) return

    // Only accept from host
    if (room.hostId !== data.userId) return

    room.state = {
      playbackTime: data.currentTime,
      isPlaying: data.isPlaying,
      lastEventBy: data.userId,
      updatedAt: Date.now(),
    }

    // Broadcast updated state to everyone in room
    socket.to(data.roomCode).emit('wp:state', {
      ...room.state,
      hostId: room.hostId,
      participantCount: room.participants.size,
    })

    // Persist to DB (throttled: max once per 5s per room)
    persistStateToDB(data.roomCode, data.currentTime, data.isPlaying, data.userId)
  })

  // ───────────────────────────────────
  // CHAT MESSAGE via socket
  // ───────────────────────────────────
  socket.on('wp:chat', async (data: { roomCode: string; userId: string; displayName: string; content: string }) => {
    const room = rooms.get(data.roomCode)
    if (!room) return

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderName: data.displayName,
      senderId: data.userId,
      type: 'chat',
      content: data.content,
      createdAt: new Date().toISOString(),
    }

    // Broadcast to entire room (including sender for confirmation)
    io.in(data.roomCode).emit('wp:chat-message', message)

    // Background push to DB
    try {
      const dbRoom = await prisma.watchPartyRoom.findUnique({
        where: { roomCode: data.roomCode },
        select: { id: true }
      })
      if (dbRoom) {
        // Find participant by userId or guest id
        const participant = await prisma.watchPartyParticipant.findFirst({
           where: { roomId: dbRoom.id, userId: data.userId }
        });

        await prisma.watchPartyMessage.create({
          data: {
            roomId: dbRoom.id,
            participantId: participant?.id || null, 
            senderName: data.displayName,
            type: 'chat',
            content: data.content,
          }
        })
      }
    } catch (err) {
      log.error({ roomCode: data.roomCode, err: err instanceof Error ? err.message : err }, 'DB persist message error')
    }
  })

  // ───────────────────────────────────
  // CHAT MESSAGE PERSIST ONLY (SFU Mode)
  // ───────────────────────────────────
  socket.on('wp:chat-persist', async (data: { roomCode: string; userId: string; displayName: string; content: string }) => {
    const room = rooms.get(data.roomCode)
    if (!room) return

    // Background push to DB only, no broadcast
    try {
      const dbRoom = await prisma.watchPartyRoom.findUnique({
        where: { roomCode: data.roomCode },
        select: { id: true }
      })
      if (dbRoom) {
        const participant = await prisma.watchPartyParticipant.findFirst({
           where: { roomId: dbRoom.id, userId: data.userId }
        });

        await prisma.watchPartyMessage.create({
          data: {
            roomId: dbRoom.id,
            participantId: participant?.id || null, 
            senderName: data.displayName,
            type: 'chat',
            content: data.content,
          }
        })
      }
    } catch (err) {
      log.error({ roomCode: data.roomCode, err: err instanceof Error ? err.message : err }, 'DB persist message error')
    }
  })

  // ───────────────────────────────────
  // CALL SIGNALING (WebRTC)
  // ───────────────────────────────────
  socket.on('wp:call-signal', (data: { roomCode: string; type: string; fromId: string; fromName: string; targetId?: string; payload?: any }) => {
    // Broadcast WebRTC signals to everyone else in the room
    socket.to(data.roomCode).emit('wp:call-signal', data)
  })

  // ───────────────────────────────────
  // ROOM LOCK & APPROVAL (Host Only)
  // ───────────────────────────────────
  socket.on('wp:toggle-lock', async (data: { roomCode: string; userId: string; isLocked: boolean }) => {
    const room = rooms.get(data.roomCode)
    if (!room || room.hostId !== data.userId) return

    try {
      await prisma.watchPartyRoom.update({
        where: { roomCode: data.roomCode },
        data: { isLocked: data.isLocked }
      })
      io.in(data.roomCode).emit('wp:lock-changed', { isLocked: data.isLocked })
    } catch (e) {
      log.error({ err: e instanceof Error ? e.message : e }, 'Toggle lock error')
    }
  })

  socket.on('wp:request-join', (data: { roomCode: string; userId: string; displayName: string; socketId: string }) => {
    const room = rooms.get(data.roomCode)
    if (!room || !room.hostSocketId) return
    // Forward request to host
    io.to(room.hostSocketId).emit('wp:join-request', data)
  })

  socket.on('wp:approve-join', (data: { roomCode: string; userId: string; hostId: string; targetSocketId: string }) => {
    const room = rooms.get(data.roomCode)
    if (!room || room.hostId !== data.hostId) return
    // Temporarily whitelist the user in memory so they can call join API, or we can just emit approved
    io.to(data.targetSocketId).emit('wp:join-approved', { roomCode: data.roomCode })
  })

  socket.on('wp:reject-join', (data: { roomCode: string; userId: string; hostId: string; targetSocketId: string }) => {
    const room = rooms.get(data.roomCode)
    if (!room || room.hostId !== data.hostId) return
    io.to(data.targetSocketId).emit('wp:join-rejected', { roomCode: data.roomCode })
  })

  socket.on('wp:kick', async (data: { roomCode: string; hostId: string; targetId: string }) => {
    const room = rooms.get(data.roomCode)
    if (!room || room.hostId !== data.hostId) return

    const target = room.participants.get(data.targetId)
    if (target) {
      io.to(target.socketId).emit('wp:kicked', { message: 'Bạn đã bị chủ phòng mời ra khỏi phòng.' })
      // Disconnect them gracefully
      handleLeave(data.roomCode, data.targetId)
    }
  })

  // ───────────────────────────────────
  // HOST TRANSFER
  // ───────────────────────────────────
  socket.on('wp:transfer-host', (data: { roomCode: string; userId: string; newHostId: string }) => {
    const room = rooms.get(data.roomCode)
    if (!room) return

    // Only current host can transfer
    if (room.hostId !== data.userId) return

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
  function handleLeave(roomCode: string, userId: string) {
    const room = rooms.get(roomCode)
    if (!room) return

    const participant = room.participants.get(userId)
    if (!participant) return

    room.participants.delete(userId)

    // Notify others
    socket.to(roomCode).emit('wp:user-left', {
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

    socket.leave(roomCode)
  }

  socket.on('wp:leave', (data: { roomCode: string; userId: string }) => {
    handleLeave(data.roomCode, data.userId)
  })

  socket.on('disconnect', () => {
    // Clear rate limit store
    rateLimitStore.delete(socket.id)

    // Find which rooms this socket was in and clean up
    for (const [roomCode, room] of rooms.entries()) {
      for (const [userId, participant] of room.participants.entries()) {
        if (participant.socketId === socket.id) {
          handleLeave(roomCode, userId)
          break
        }
      }
    }
  })
}
