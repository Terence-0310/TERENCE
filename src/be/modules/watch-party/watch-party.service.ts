// ============================================
// Watch Party — Service Layer (Phase 2)
// ============================================
// Business logic for watch party operations.
// Includes: Room CRUD, Chat, Host Transfer, Sync.

import * as repo from './watch-party.repository'
import { prisma } from '@/lib/db'
import { getMovieLoader, getEpisodeLoader, getUserLoader } from '@/src/be/shared/db/loaders'
import { redis } from '@/src/lib/redis'
import { logger } from '@/src/be/shared/utils/logger'
import { notifyRoom } from '@/src/be/shared/realtime/notify'

const log = logger.child({ module: 'watch-party-service' })

// ── Helpers ──

/** Generate a short uppercase room code (6 chars) */
function generateRandomRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

async function getUniqueRoomCode(): Promise<string> {
  if (redis) {
    try {
      const REDIS_KEY = 'watchparty:room_codes'
      
      // Nếu Pool sắp hết (< 100), bơm thêm 1000 mã mới vào Set
      const poolSize = await redis.scard(REDIS_KEY)
      if (poolSize < 100) {
        const newCodes = Array.from({ length: 1000 }, () => generateRandomRoomCode())
        await redis.sadd(REDIS_KEY, ...newCodes)
      }

      // Pop (rút) 1 mã ngẫu nhiên ra khỏi Set với độ trễ O(1)
      const code = await redis.spop(REDIS_KEY)
      if (code) return code
    } catch {
      log.warn('Redis SPOP error, falling back to DB check')
    }
  }

  // Fallback (Nếu Redis sập): Kiểm tra tuần tự bằng Prisma
  let roomCode = generateRandomRoomCode()
  let attempts = 0
  while (attempts < 5) {
    const existing = await repo.findRoomByCode(roomCode)
    if (!existing) break
    roomCode = generateRandomRoomCode()
    attempts++
  }
  return roomCode
}

/**
 * A participant tied to an account may only be acted on by that account.
 * Guest participants (userId null) cannot be verified beyond their id.
 */
function assertActsAs(
  participant: { userId: string | null } | undefined | null,
  callerUserId: string | null | undefined,
): void {
  if (participant?.userId && participant.userId !== callerUserId) {
    throw new WatchPartyError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này')
  }
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

/**
 * Creates a new Watch Party room with the specified host and optional initial movie/episode.
 * Generates a unique 6-character room code.
 * 
 * @param input - The room creation payload
 * @returns The created room, host participant, and initial state
 */
export async function createRoom(input: CreateRoomInput) {
  const roomCode = await getUniqueRoomCode()

  // Validate Foreign Keys to prevent Prisma errors
  const [movieExists, epExists, userExists] = await Promise.all([
    input.movieId ? getMovieLoader().load(String(input.movieId)) : Promise.resolve(null),
    input.episodeId ? getEpisodeLoader().load(String(input.episodeId)) : Promise.resolve(null),
    input.userId && !input.userId.startsWith('g-') ? getUserLoader().load(String(input.userId)) : Promise.resolve(null)
  ])

  let validMovieId = movieExists ? String(input.movieId) : null
  let validEpisodeId = epExists ? String(input.episodeId) : null
  let validUserId = userExists ? String(input.userId) : null

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

/**
 * Joins an existing Watch Party room. Validates room status and locks.
 * If the user is already in the room, marks them as online (rejoin).
 * 
 * @param input - Payload containing room code and user details
 * @returns The room, participant details, and rejoin status
 * @throws WatchPartyError if room is not found, ended, or locked without approval
 */
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
    const userExists = await getUserLoader().load(String(input.userId))
    if (userExists) validUserId = String(input.userId)
  }

  // Check if participant already exists (rejoin)
  const existing = await repo.findParticipant(room.id, {
    userId: validUserId ?? undefined,
    displayName: input.displayName,
  })

  // Room lock: only members the host has admitted (status ACTIVE — set by
  // approveParticipant) may enter. A pending/rejected request does not count.
  const admitted = existing?.status === 'ACTIVE'
  if (room.isLocked && !admitted) {
    throw new WatchPartyError('ROOM_LOCKED', 'Phòng đang được khoá. Cần sự phê duyệt của chủ phòng.')
  }

  if (existing) {
    // Unlocked room: a leftover pending request simply becomes a member.
    if (!admitted) {
      await prisma.watchPartyParticipant.update({ where: { id: existing.id }, data: { status: 'ACTIVE' } })
    }
    const participant = await repo.markParticipantOnline(existing.id)
    await repo.createMessage({
      roomId: room.id,
      senderName: 'Hệ thống',
      type: 'system',
      content: `${input.displayName} đã quay lại phòng`,
    })
    return { room, participant, state: room.state, isRejoin: true }
  }

  // Capacity check — enforce maxMembers BEFORE admitting a new participant.
  // `room.participants` are the non-left rows; count those actually present
  // (online and admitted, i.e. not in the PENDING waiting room) so a "Cặp đôi"
  // (2-seat) room can't be over-filled. Rejoins above bypass this by design.
  const presentCount = room.participants.filter(
    (p) => p.isOnline && p.status !== 'PENDING',
  ).length
  if (room.maxMembers > 0 && presentCount >= room.maxMembers) {
    throw new WatchPartyError('ROOM_FULL', `Phòng đã đầy (tối đa ${room.maxMembers} người).`)
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

// ── Request Join (Waiting Room) ──

export interface RequestJoinInput {
  roomCode: string
  displayName: string
  userId?: string | null
}

/**
 * Submits a join request to a locked Watch Party room, placing the user in the waiting room.
 * Notifies the room host via LiveKit.
 * 
 * @param input - Join request payload
 * @returns The room and the newly created PENDING participant
 * @throws WatchPartyError if room is invalid
 */
export async function requestJoin(input: RequestJoinInput) {
  const room = await repo.findRoomByCode(input.roomCode)
  if (!room) throw new WatchPartyError('ROOM_NOT_FOUND', 'Phòng không tồn tại')
  if (room.status !== 'ACTIVE') throw new WatchPartyError('ROOM_ENDED', 'Phòng đã kết thúc')

  let validUserId = null
  if (input.userId && !input.userId.startsWith('g-')) {
    const userExists = await getUserLoader().load(String(input.userId))
    if (userExists) validUserId = String(input.userId)
  }

  // Reuse this person's existing request instead of stacking duplicates:
  // already admitted → nothing to request; pending → same request; rejected →
  // re-open it. Waiting users are not counted as online members.
  const existing = await repo.findParticipant(room.id, {
    userId: validUserId ?? undefined,
    displayName: input.displayName,
  })
  if (existing?.status === 'ACTIVE') {
    return { room, participant: existing }
  }
  const participant = existing
    ? await prisma.watchPartyParticipant.update({
        where: { id: existing.id },
        data: { status: 'PENDING', isOnline: false },
      })
    : await prisma.watchPartyParticipant.create({
        data: {
          roomId: room.id,
          userId: validUserId,
          displayName: input.displayName,
          role: validUserId ? 'MEMBER' : 'GUEST',
          status: 'PENDING',
          isOnline: false,
        },
      })

  // Notify the host over Socket.IO (always available) — the host UI listens
  // for `wp:join-request`. LiveKit below is an extra channel for hosts in a call.
  notifyRoom(room.roomCode, 'wp:join-request', {
    userId: participant.id,
    displayName: participant.displayName,
    socketId: '',
  })

  // Notify host that a user requested to join
  try {
    const { sendLiveKitDataMessage } = await import('@/lib/livekit')
    await sendLiveKitDataMessage(room.roomCode, {
      type: 'JOIN_REQUEST',
      participant: { id: participant.id, displayName: participant.displayName }
    }).catch((err) => log.error({ err: err instanceof Error ? err.message : err }, 'LiveKit send error'))
  } catch { /* ignore */ }

  return { room, participant }
}

// ── Approve/Reject Participant ──

export interface ApproveParticipantInput {
  roomCode: string
  callerUserId?: string | null
  hostParticipantId: string
  targetParticipantId: string
  action: 'APPROVE' | 'REJECT'
}

/**
 * Approves or rejects a participant's join request (only usable by HOST or COHOST).
 * Broadcasts the decision via LiveKit.
 * 
 * @param input - Approval payload
 * @returns The updated participant record
 * @throws WatchPartyError if permissions are insufficient or participant is not found
 */
export async function approveParticipant(input: ApproveParticipantInput) {
  const room = await repo.findRoomByCode(input.roomCode)
  if (!room) throw new WatchPartyError('ROOM_NOT_FOUND', 'Phòng không tồn tại')

  const participants = room.participants
  const actor = participants?.find((p) => p.id === input.hostParticipantId && (p.role === 'HOST' || p.role === 'COHOST'))
  if (!actor) {
    throw new WatchPartyError('FORBIDDEN', 'Chỉ host hoặc co-host mới có quyền duyệt thành viên')
  }
  assertActsAs(actor, input.callerUserId)

  const target = participants?.find((p) => p.id === input.targetParticipantId)
  if (!target) throw new WatchPartyError('PARTICIPANT_NOT_FOUND', 'Người dùng không tồn tại trong phòng')
  if (target.status !== 'PENDING') {
    throw new WatchPartyError('NOT_PENDING', 'Yêu cầu này đã được xử lý')
  }

  // Approving admits a new member, so it must respect the room capacity.
  if (input.action === 'APPROVE' && room.maxMembers > 0) {
    const presentCount = participants.filter((p) => p.isOnline && p.status === 'ACTIVE').length
    if (presentCount >= room.maxMembers) {
      throw new WatchPartyError('ROOM_FULL', `Phòng đã đầy (tối đa ${room.maxMembers} người).`)
    }
  }

  const status = input.action === 'APPROVE' ? 'ACTIVE' : 'REJECTED'
  
  const updatedParticipant = await prisma.watchPartyParticipant.update({
    where: { id: input.targetParticipantId },
    data: { status },
  })

  if (input.action === 'APPROVE') {
    await repo.createMessage({
      roomId: room.id,
      senderName: 'Hệ thống',
      type: 'system',
      content: `${updatedParticipant.displayName} đã được duyệt vào phòng`,
    })
  }

  // Send LiveKit broadcast to notify everyone (including the waiting user if they are subscribed)
  try {
    const { sendLiveKitDataMessage } = await import('@/lib/livekit')
    await sendLiveKitDataMessage(room.roomCode, {
      type: input.action === 'APPROVE' ? 'JOIN_APPROVED' : 'JOIN_REJECTED',
      participantId: updatedParticipant.id,
      displayName: updatedParticipant.displayName
    }).catch((err) => log.error({ err: err instanceof Error ? err.message : err }, 'LiveKit send error'))
  } catch { /* ignore */ }

  return updatedParticipant
}

// ── Update Participant Role ──

export interface UpdateRoleInput {
  roomCode: string
  callerUserId?: string | null
  hostParticipantId: string
  targetParticipantId: string
  role: 'COHOST' | 'MEMBER'
}

export async function updateParticipantRole(input: UpdateRoleInput) {
  const room = await repo.findRoomByCode(input.roomCode)
  if (!room) throw new WatchPartyError('ROOM_NOT_FOUND', 'Phòng không tồn tại')

  const participants = room.participants
  const host = participants?.find((p) => p.id === input.hostParticipantId && p.role === 'HOST')
  if (!host) {
    throw new WatchPartyError('FORBIDDEN', 'Chỉ host mới có quyền phân quyền')
  }
  assertActsAs(host, input.callerUserId)

  const target = participants?.find((p) => p.id === input.targetParticipantId)
  if (!target) throw new WatchPartyError('PARTICIPANT_NOT_FOUND', 'Người dùng không tồn tại trong phòng')

  if (target.role === 'HOST') {
    throw new WatchPartyError('FORBIDDEN', 'Không thể thay đổi quyền của Host')
  }

  const updatedParticipant = await repo.updateParticipantRole(input.targetParticipantId, input.role)

  await repo.createMessage({
    roomId: room.id,
    senderName: 'Hệ thống',
    type: 'system',
    content: `${target.displayName} đã được cấp quyền ${input.role === 'COHOST' ? 'Co-host' : 'Member'}`,
  })

  return updatedParticipant
}

// ── Leave Room (with host transfer) ──

export interface LeaveRoomInput {
  roomCode: string
  participantId: string
  callerUserId?: string | null
}

/**
 * Removes a participant from the room (marks offline).
 * If the last participant leaves, the room ends.
 * If the host leaves, transfers host privileges to the next eligible participant.
 * 
 * @param input - Leave payload
 * @returns Object indicating if the room ended and who the new host is (if transferred)
 */
export async function leaveRoom(input: LeaveRoomInput) {
  const room = await repo.findRoomByCode(input.roomCode)
  if (!room) {
    throw new WatchPartyError('ROOM_NOT_FOUND', 'Phòng không tồn tại')
  }

  const leavingParticipant = await repo.findParticipantById(input.participantId)
  if (leavingParticipant && leavingParticipant.roomId !== room.id) {
    throw new WatchPartyError('PARTICIPANT_NOT_FOUND', 'Người dùng không tồn tại trong phòng')
  }
  assertActsAs(leavingParticipant, input.callerUserId)
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

// ── Update Room ──

export interface UpdateRoomInput {
  roomCode: string
  callerUserId?: string | null
  title?: string
  isLocked?: boolean
  theme?: string
  participantId: string // the acting host / co-host
}

export async function updateRoom(input: UpdateRoomInput) {
  const room = await repo.findRoomByCode(input.roomCode)
  if (!room) {
    throw new WatchPartyError('ROOM_NOT_FOUND', 'Phòng không tồn tại')
  }
  if (room.status !== 'ACTIVE') {
    throw new WatchPartyError('ROOM_ENDED', 'Phòng đã kết thúc')
  }

  // Only the host / co-host may change room settings.
  const actor = room.participants?.find((p) => p.id === input.participantId)
  if (!actor || (actor.role !== 'HOST' && actor.role !== 'COHOST')) {
    throw new WatchPartyError('FORBIDDEN', 'Chỉ host hoặc co-host mới có quyền sửa cài đặt phòng')
  }
  assertActsAs(actor, input.callerUserId)

  // Room theme is a TCoin perk: validate the id and ensure the actor still
  // holds the room-theme perk before persisting it.
  if (input.theme !== undefined) {
    const { ROOM_THEME_IDS } = await import('@/lib/watch-party/themes')
    if (!ROOM_THEME_IDS.includes(input.theme)) {
      throw new WatchPartyError('FORBIDDEN', 'Theme không hợp lệ')
    }
    if (input.theme !== 'default') {
      const actorUserId = actor?.userId
      const { getActivePerks } = await import('@/src/be/modules/tcoin/tcoin.service')
      const perks = actorUserId ? await getActivePerks(actorUserId) : null
      if (!perks?.roomTheme) {
        throw new WatchPartyError('FORBIDDEN', 'Cần đổi ưu đãi “Theme phòng xem chung” để dùng tính năng này')
      }
    }
  }

  const updated = await prisma.watchPartyRoom.update({
    where: { id: room.id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.isLocked !== undefined && { isLocked: input.isLocked }),
      ...(input.theme !== undefined && { theme: input.theme }),
    },
  })

  // System message
  if (input.isLocked !== undefined) {
    await repo.createMessage({
      roomId: room.id,
      senderName: 'Hệ thống',
      type: 'system',
      content: `Phòng đã ${input.isLocked ? 'bị khóa' : 'được mở khóa'}`,
    })
  }

  return updated
}

// ── Chat Messages ──

export interface SendMessageInput {
  roomCode: string
  participantId: string
  senderName: string
  content: string
  callerUserId?: string | null
}

export async function sendMessage(input: SendMessageInput) {
  const room = await repo.findRoomByCode(input.roomCode)
  if (!room) {
    throw new WatchPartyError('ROOM_NOT_FOUND', 'Phòng không tồn tại')
  }
  if (room.status !== 'ACTIVE') {
    throw new WatchPartyError('ROOM_ENDED', 'Phòng đã kết thúc')
  }

  // Sender must be an admitted member of this room; the display name comes
  // from their participant row, not from the request.
  const sender = room.participants?.find((p) => p.id === input.participantId)
  if (!sender || sender.status !== 'ACTIVE') {
    throw new WatchPartyError('FORBIDDEN', 'Bạn chưa tham gia phòng này')
  }
  assertActsAs(sender, input.callerUserId)

  return repo.createMessage({
    roomId: room.id,
    participantId: sender.id,
    senderName: sender.displayName,
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
  callerUserId?: string | null
}

/**
 * Synchronizes the playback state of a room.
 * Ensures that only the host can trigger playback control events (PLAY, PAUSE, SEEK).
 * 
 * @param input - Sync state payload
 * @returns The updated room state
 * @throws WatchPartyError for unauthorized actions
 */
export async function syncState(input: SyncStateInput) {
  const room = await repo.findRoomByCode(input.roomCode)
  if (!room) {
    throw new WatchPartyError('ROOM_NOT_FOUND', 'Phòng không tồn tại')
  }
  if (room.status !== 'ACTIVE') {
    throw new WatchPartyError('ROOM_ENDED', 'Phòng đã kết thúc')
  }

  // ── Host-only validation: only the host can change playback state ──
  // (room includes participants from findRoomByCode)
  const actor = room.participants?.find((p) => p.id === input.eventBy)
  if (!actor || (actor.role !== 'HOST' && actor.role !== 'COHOST')) {
    throw new WatchPartyError('FORBIDDEN', 'Chỉ host mới điều khiển được player')
  }
  assertActsAs(actor, input.callerUserId)

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
