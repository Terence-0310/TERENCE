// ============================================
// Watch Party — Repository Layer
// ============================================
// All Prisma queries for watch party models.
// Used by service layer, never called directly from routes.

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

// ── Room ──

export async function createRoomRecord(data: {
  roomCode: string
  title: string
  hostUserId?: string | null
  movieId?: string | null
  episodeId?: string | null
  shareCode?: string | null
  maxMembers?: number
}) {
  return prisma.watchPartyRoom.create({
    data: {
      roomCode: data.roomCode,
      title: data.title,
      hostUserId: data.hostUserId ?? null,
      movieId: data.movieId ?? null,
      episodeId: data.episodeId ?? null,
      shareCode: data.shareCode ?? null,
      maxMembers: data.maxMembers ?? 10,
      status: 'ACTIVE',
    },
  })
}

export async function findRoomByCode(roomCode: string) {
  return prisma.watchPartyRoom.findUnique({
    where: { roomCode },
    include: {
      host: { select: { id: true, name: true, avatar: true } },
      participants: {
        where: { leftAt: null },
        orderBy: { joinedAt: 'asc' },
        // Pull the participant's TCoin perk state so the panel can render the
        // neon avatar frame / exclusive badge next to their name.
        include: {
          user: { select: { avatar: true, avatarFrameUntil: true, exclusiveBadgeUntil: true } },
        },
      },
      state: true,
    },
  })
}

export async function findActiveRooms(limit = 20) {
  return prisma.watchPartyRoom.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      host: { select: { id: true, name: true } },
      _count: { select: { participants: { where: { leftAt: null, isOnline: true } } } },
    },
  })
}

export async function updateRoomStatus(roomCode: string, status: 'ACTIVE' | 'ENDED') {
  return prisma.watchPartyRoom.update({
    where: { roomCode },
    data: { status, updatedAt: new Date() },
  })
}

export async function updateRoomSyncTimestamp(roomCode: string) {
  return prisma.watchPartyRoom.update({
    where: { roomCode },
    data: { lastSyncedAt: new Date() },
  })
}

// ── Participant ──

export async function createParticipant(data: {
  roomId: string
  userId?: string | null
  displayName: string
  role: 'HOST' | 'MEMBER' | 'GUEST'
}) {
  return prisma.watchPartyParticipant.create({
    data: {
      roomId: data.roomId,
      userId: data.userId ?? null,
      displayName: data.displayName,
      role: data.role,
      isOnline: true,
      lastSeenAt: new Date(),
    },
  })
}

/**
 * Find a person's current (not-left) seat in a room. If several rows exist
 * (e.g. an old rejected request next to an admitted one) the ACTIVE row wins,
 * then the most recent one.
 */
export async function findParticipant(roomId: string, identity: { userId?: string; displayName?: string }) {
  let where: Prisma.WatchPartyParticipantWhereInput
  if (identity.userId) {
    where = { roomId, userId: identity.userId, leftAt: null }
  } else if (identity.displayName) {
    // Only guest rows: a guest must never resume a signed-in user's seat.
    where = { roomId, displayName: identity.displayName, userId: null, leftAt: null }
  } else {
    return null
  }
  const rows = await prisma.watchPartyParticipant.findMany({ where, orderBy: { joinedAt: 'desc' } })
  return rows.find((r) => r.status === 'ACTIVE') ?? rows[0] ?? null
}

export async function markParticipantOffline(participantId: string) {
  return prisma.watchPartyParticipant.update({
    where: { id: participantId },
    data: { isOnline: false, leftAt: new Date() },
  })
}

export async function updateParticipantRole(participantId: string, role: 'HOST' | 'COHOST' | 'MEMBER' | 'GUEST') {
  return prisma.watchPartyParticipant.update({
    where: { id: participantId },
    data: { role },
  })
}

export async function markParticipantOnline(participantId: string) {
  return prisma.watchPartyParticipant.update({
    where: { id: participantId },
    data: { isOnline: true, leftAt: null, lastSeenAt: new Date() },
  })
}

export async function getOnlineParticipants(roomId: string) {
  return prisma.watchPartyParticipant.findMany({
    where: { roomId, leftAt: null, isOnline: true },
    orderBy: { joinedAt: 'asc' },
  })
}

export async function countOnlineParticipants(roomId: string) {
  return prisma.watchPartyParticipant.count({
    where: { roomId, leftAt: null, isOnline: true },
  })
}

// ── State ──

export async function createState(data: {
  roomId: string
  movieId?: string | null
  episodeId?: string | null
}) {
  return prisma.watchPartyState.create({
    data: {
      roomId: data.roomId,
      movieId: data.movieId ?? null,
      episodeId: data.episodeId ?? null,
      playbackTime: 0,
      isPlaying: false,
      playbackRate: 1,
      version: 1,
    },
  })
}

export async function getState(roomId: string) {
  return prisma.watchPartyState.findUnique({ where: { roomId } })
}

export async function updateState(
  roomId: string,
  data: {
    playbackTime?: number
    isPlaying?: boolean
    playbackRate?: number
    lastEventType?: string
    lastEventBy?: string
    episodeId?: string | null
    movieId?: string | null
  },
) {
  return prisma.watchPartyState.update({
    where: { roomId },
    data: {
      ...data,
      version: { increment: 1 },
    },
  })
}

// ── Messages ──

export async function createMessage(data: {
  roomId: string
  participantId?: string | null
  senderName: string
  type: 'chat' | 'system' | 'reaction'
  content: string
}) {
  return prisma.watchPartyMessage.create({
    data: {
      roomId: data.roomId,
      participantId: data.participantId ?? null,
      senderName: data.senderName,
      type: data.type,
      content: data.content,
    },
  })
}

export async function getMessages(roomId: string, limit = 100, cursor?: string) {
  return prisma.watchPartyMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })
}

export async function getMessagesSince(roomId: string, since: Date) {
  return prisma.watchPartyMessage.findMany({
    where: { roomId, createdAt: { gt: since } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })
}

export async function countMessages(roomId: string) {
  return prisma.watchPartyMessage.count({ where: { roomId } })
}

// ── Host Transfer ──

export async function findParticipantById(participantId: string) {
  return prisma.watchPartyParticipant.findUnique({ where: { id: participantId } })
}

export async function transferHost(roomId: string, oldHostId: string, newHostId: string) {
  // Demote old host, promote new host
  await prisma.$transaction([
    prisma.watchPartyParticipant.update({
      where: { id: oldHostId },
      data: { role: 'MEMBER' },
    }),
    prisma.watchPartyParticipant.update({
      where: { id: newHostId },
      data: { role: 'HOST' },
    }),
  ])
}

export async function updateRoomHost(roomCode: string, newHostUserId: string | null) {
  return prisma.watchPartyRoom.update({
    where: { roomCode },
    data: { hostUserId: newHostUserId },
  })
}

export async function getNextEligibleHost(roomId: string, excludeId: string) {
  return prisma.watchPartyParticipant.findFirst({
    where: {
      roomId,
      id: { not: excludeId },
      isOnline: true,
      leftAt: null,
    },
    orderBy: { joinedAt: 'asc' },
  })
}
