// ============================================
// Watch Party — Service Layer (Phase 2)
// ============================================
// Business logic for watch party operations.
// Includes: Room CRUD, Chat, Host Transfer, Sync.

import * as repo from './watch-party.repository'
import { prisma } from '@/lib/db'

// ── Helpers ──

/** Generate a short uppercase room code (6 chars) */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ── Create Room ──

export interface CreateRoomInput {
  title: string
  movieId?: string | null
  episodeId?: string | null
  displayName: string
  userId?: string | null
  maxMembers?: number
}

export async function createRoom(input: CreateRoomInput) {
  let roomCode = generateRoomCode()
  let attempts = 0
  while (attempts < 5) {
    const existing = await repo.findRoomByCode(roomCode)
    if (!existing) break
    roomCode = generateRoomCode()
    attempts++
  }

  // Validate Foreign Keys to prevent Prisma errors
  let validMovieId = null
  if (input.movieId) {
    const movieExists = await prisma.movie.findUnique({ where: { id: String(input.movieId) } })
    if (movieExists) validMovieId = String(input.movieId)
  }

  let validEpisodeId = null
  if (input.episodeId) {
    const epExists = await prisma.episode.findUnique({ where: { id: String(input.episodeId) } })
    if (epExists) validEpisodeId = String(input.episodeId)
  }

  let validUserId = null
  if (input.userId && !input.userId.startsWith('g-')) {
    const userExists = await prisma.user.findUnique({ where: { id: String(input.userId) } })
    if (userExists) validUserId = String(input.userId)
  }

  const room = await repo.createRoomRecord({
    roomCode,
    title: input.title,
    hostUserId: validUserId,
    movieId: validMovieId,
    episodeId: validEpisodeId,
    maxMembers: input.maxMembers,
  })

  const hostParticipant = await repo.createParticipant({
    roomId: room.id,
    userId: validUserId,
    displayName: input.displayName,
    role: 'HOST',
  })

  const state = await repo.createState({
    roomId: room.id,
    movieId: input.movieId,
    episodeId: input.episodeId,
  })

  // System message for room creation
  await repo.createMessage({
    roomId: room.id,
    senderName: 'Hệ thống',
    type: 'system',
    content: `${input.displayName} đã tạo phòng`,
  })

  return { room, hostParticipant, state }
}

// ── Join Room ──

export interface JoinRoomInput {
  roomCode: string
  displayName: string
  userId?: string | null
}

export async function joinRoom(input: JoinRoomInput) {
  const room = await repo.findRoomByCode(input.roomCode)
  if (!room) {
    throw new WatchPartyError('ROOM_NOT_FOUND', 'Phòng không tồn tại')
  }
  if (room.status !== 'ACTIVE') {
    throw new WatchPartyError('ROOM_ENDED', 'Phòng đã kết thúc')
  }

  let validUserId = null
  if (input.userId && !input.userId.startsWith('g-')) {
    const userExists = await prisma.user.findUnique({ where: { id: String(input.userId) } })
    if (userExists) validUserId = String(input.userId)
  }

  // Check if participant already exists (rejoin)
  const existing = await repo.findParticipant(room.id, {
    userId: validUserId ?? undefined,
    displayName: input.displayName,
  })

  if (existing) {
    const participant = await repo.markParticipantOnline(existing.id)
    await repo.createMessage({
      roomId: room.id,
      senderName: 'Hệ thống',
      type: 'system',
      content: `${input.displayName} đã quay lại phòng`,
    })
    return { room, participant, state: room.state, isRejoin: true }
  }

  const participant = await repo.createParticipant({
    roomId: room.id,
    userId: validUserId,
    displayName: input.displayName,
    role: validUserId ? 'MEMBER' : 'GUEST',
  })

  // System join message
  await repo.createMessage({
    roomId: room.id,
    senderName: 'Hệ thống',
    type: 'system',
    content: `${input.displayName} đã tham gia phòng`,
  })

  return { room, participant, state: room.state, isRejoin: false }
}

// ── Leave Room (with host transfer) ──

export interface LeaveRoomInput {
  roomCode: string
  participantId: string
}

export async function leaveRoom(input: LeaveRoomInput) {
  const room = await repo.findRoomByCode(input.roomCode)
  if (!room) {
    throw new WatchPartyError('ROOM_NOT_FOUND', 'Phòng không tồn tại')
  }

  const leavingParticipant = await repo.findParticipantById(input.participantId)
  if (!leavingParticipant) {
    throw new WatchPartyError('PARTICIPANT_NOT_FOUND', 'Không tìm thấy participant')
  }

  // Mark offline
  await repo.markParticipantOffline(input.participantId)

  // System leave message
  await repo.createMessage({
    roomId: room.id,
    senderName: 'Hệ thống',
    type: 'system',
    content: `${leavingParticipant.displayName} đã rời phòng`,
  })

  const remaining = await repo.countOnlineParticipants(room.id)

  // If no one left → end room
  if (remaining === 0) {
    await repo.updateRoomStatus(input.roomCode, 'ENDED')
    await repo.createMessage({
      roomId: room.id,
      senderName: 'Hệ thống',
      type: 'system',
      content: 'Phòng đã kết thúc — không còn ai',
    })
    return { ended: true, newHost: null }
  }

  // If leaving participant is host → transfer host
  let newHost = null
  if (leavingParticipant.role === 'HOST') {
    const nextHost = await repo.getNextEligibleHost(room.id, input.participantId)
    if (nextHost) {
      await repo.transferHost(room.id, input.participantId, nextHost.id)
      await repo.updateRoomHost(input.roomCode, nextHost.userId ?? null)
      newHost = { id: nextHost.id, displayName: nextHost.displayName }

      await repo.createMessage({
        roomId: room.id,
        senderName: 'Hệ thống',
        type: 'system',
        content: `${nextHost.displayName} đã trở thành Host mới`,
      })
    }
  }

  return { ended: false, newHost }
}

// ── Get Room ──

export async function getRoom(roomCode: string) {
  const room = await repo.findRoomByCode(roomCode)
  if (!room) {
    throw new WatchPartyError('ROOM_NOT_FOUND', 'Phòng không tồn tại')
  }
  return room
}

// ── Chat Messages ──

export interface SendMessageInput {
  roomCode: string
  participantId: string
  senderName: string
  content: string
}

export async function sendMessage(input: SendMessageInput) {
  const room = await repo.findRoomByCode(input.roomCode)
  if (!room) {
    throw new WatchPartyError('ROOM_NOT_FOUND', 'Phòng không tồn tại')
  }
  if (room.status !== 'ACTIVE') {
    throw new WatchPartyError('ROOM_ENDED', 'Phòng đã kết thúc')
  }

  return repo.createMessage({
    roomId: room.id,
    participantId: input.participantId,
    senderName: input.senderName,
    type: 'chat',
    content: input.content,
  })
}

export async function getMessages(roomCode: string, limit = 100) {
  const room = await repo.findRoomByCode(roomCode)
  if (!room) {
    throw new WatchPartyError('ROOM_NOT_FOUND', 'Phòng không tồn tại')
  }
  return repo.getMessages(room.id, limit)
}

export async function getNewMessages(roomCode: string, since: Date) {
  const room = await repo.findRoomByCode(roomCode)
  if (!room) {
    throw new WatchPartyError('ROOM_NOT_FOUND', 'Phòng không tồn tại')
  }
  return repo.getMessagesSince(room.id, since)
}

// ── Sync State ──

export interface SyncStateInput {
  roomCode: string
  playbackTime?: number
  isPlaying?: boolean
  playbackRate?: number
  eventType?: string
  eventBy?: string
  episodeId?: string | null
}

export async function syncState(input: SyncStateInput) {
  const room = await repo.findRoomByCode(input.roomCode)
  if (!room) {
    throw new WatchPartyError('ROOM_NOT_FOUND', 'Phòng không tồn tại')
  }
  if (room.status !== 'ACTIVE') {
    throw new WatchPartyError('ROOM_ENDED', 'Phòng đã kết thúc')
  }

  // ── Host-only validation: only host can control playback ──
  if (input.eventBy && input.eventType && ['PLAY', 'PAUSE', 'SEEK'].includes(input.eventType)) {
    // room includes participants from findRoomByCode
    const participants = (room as any).participants as Array<{ id: string; role: string }> | undefined
    const hostParticipant = participants?.find((p) => p.role === 'HOST')
    if (hostParticipant && hostParticipant.id !== input.eventBy) {
      throw new WatchPartyError('FORBIDDEN', 'Chỉ host mới điều khiển được player')
    }
  }

  const state = await repo.updateState(room.id, {
    playbackTime: input.playbackTime,
    isPlaying: input.isPlaying,
    playbackRate: input.playbackRate,
    lastEventType: input.eventType,
    lastEventBy: input.eventBy,
    episodeId: input.episodeId,
  })

  await repo.updateRoomSyncTimestamp(input.roomCode)
  return state
}

// ── List Active Rooms ──

export async function listActiveRooms(limit = 20) {
  return repo.findActiveRooms(limit)
}

// ── Error Class ──

export class WatchPartyError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'WatchPartyError'
  }
}
